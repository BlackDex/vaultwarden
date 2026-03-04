// playwright/mailpit.ts
import { MailpitClient } from "mailpit-api";

// Shape of a normalized message — matches fields used across the test suite
export interface MailpitMessage {
    subject: string;
    html: string;
    text: string;
    from: Array<{ address: string; name: string }>;
    to: Array<{ address: string; name: string }>;
}

export class MailpitBuffer {
    private readonly email: string;
    private readonly client: MailpitClient;
    // IDs already consumed by a previous .expect() call
    private readonly seenIds = new Set<string>();

    constructor(email: string, client: MailpitClient) {
        this.email = email;
        this.client = client;
    }

    /**
     * Wait until a message addressed to this buffer's email matches the
     * predicate.  Polls every 500 ms, times out after `timeoutMs` (default 15 s).
     * Consumed messages are remembered so they won't be returned again.
     */
    async expect(
        predicate: (mail: MailpitMessage) => boolean,
        timeoutMs = 15_000,
    ): Promise<MailpitMessage> {
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
            // Mailpit supports a search query in list: "to:user@example.com"
            const result = await this.client.listMessages({
                query: `to:"${this.email}"`,
                limit: 50,
            });

            for (const summary of result.messages ?? []) {
                if (this.seenIds.has(summary.ID)) continue;

                // Fetch full message to get HTML body
                const full = await this.client.getMessage(summary.ID);
                const msg = this.normalize(full);

                if (predicate(msg)) {
                    this.seenIds.add(summary.ID);
                    return msg;
                }
            }

            await new Promise((r) => setTimeout(r, 500));
        }

        throw new Error(
            `MailpitBuffer(${this.email}): timed out after ${timeoutMs} ms waiting for matching email`,
        );
    }

    /** No-op — kept for API compatibility with MailDev's MailBuffer */
    close(): void {}

    private normalize(msg: any): MailpitMessage {
        return {
            subject: msg.Subject ?? "",
            html: msg.HTML ?? "",
            text: msg.Text ?? "",
            from: (msg.From ? [msg.From] : []).map((a: any) => ({
                address: a.Address ?? "",
                name: a.Name ?? "",
            })),
            to: (msg.To ?? []).map((a: any) => ({
                address: a.Address ?? "",
                name: a.Name ?? "",
            })),
        };
    }
}

export class MailpitServer {
    private readonly client: MailpitClient;

    constructor(
        baseUrl = `${process.env.MAILPIT_API_URL ?? "http://mailpit:8026"}`,
    ) {
        this.client = new MailpitClient(baseUrl);
    }

    /** Call in beforeAll — clears all existing messages so tests start clean */
    async listen(): Promise<void> {
        await this.client.deleteMessages();
    }

    /** Returns a per-recipient buffer (can create as many as needed) */
    buffer(email: string): MailpitBuffer {
        return new MailpitBuffer(email, this.client);
    }

    /** Call in afterAll */
    async close(): Promise<void> {
        // nothing to tear down — Mailpit runs as an external service
    }
}