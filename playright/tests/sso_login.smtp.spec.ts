import { test, expect, type TestInfo } from '../fixtures';
import { MailpitServer, type MailpitBuffer as MailBuffer } from '../mailpit';

import { logNewUser, logUser } from './setups/sso';
import { activateEmail, disableEmail } from './setups/2fa';
import * as utils from "../global-utils";

let users = utils.loadEnv();

let mailServer: MailpitServer;

test.beforeAll('Setup', async ({ browser }, testInfo: TestInfo) => {
    mailServer = new MailpitServer();
    await mailServer.listen();

    await utils.startVault(browser, testInfo, {
        SSO_ENABLED: true,
        SSO_ONLY: false,
        SMTP_HOST: process.env.MAILDEV_HOST,
        SMTP_FROM: process.env.PW_SMTP_FROM,
    });
});

test.afterAll('Teardown', async ({ }) => {
    await utils.stopVault();
    await mailServer.close();
});

test('Create and activate 2FA', async ({ page }) => {
    const mailBuffer = mailServer.buffer(users.user1.email);

    await logNewUser(test, page, users.user1, { mailBuffer: mailBuffer });

    await activateEmail(test, page, users.user1, mailBuffer);

    mailBuffer.close();
});

test('Log and disable', async ({ page }) => {
    const mailBuffer = mailServer.buffer(users.user1.email);

    await logUser(test, page, users.user1, { mailBuffer: mailBuffer, mail2fa: true });

    await disableEmail(test, page, users.user1);

    mailBuffer.close();
});
