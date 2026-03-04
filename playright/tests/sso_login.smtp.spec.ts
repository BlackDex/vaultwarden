import { test, expect, type TestInfo } from '../fixtures';
import { MailDev } from 'maildev';

import { logNewUser, logUser } from './setups/sso';
import { activateEmail, disableEmail } from './setups/2fa';
import * as utils from "../global-utils";

let users = utils.loadEnv();

let mailserver: MailDev;

test.beforeAll('Setup', async ({ browser }, testInfo: TestInfo) => {
    mailserver = new MailDev({
        port: parseInt(process.env.MAILDEV_SMTP_PORT, 10),
        web: { port: parseInt(process.env.MAILDEV_WEB_PORT, 10) },
    })

    await mailserver.listen();

    await utils.startVault(browser, testInfo, {
        SSO_ENABLED: true,
        SSO_ONLY: false,
        SMTP_HOST: process.env.MAILDEV_HOST,
        SMTP_FROM: process.env.PW_SMTP_FROM,
    });
});

test.afterAll('Teardown', async ({ }) => {
    await utils.stopVault();
    if (mailserver) {
        await mailserver.close();
    }
});

test('Create and activate 2FA', async ({ page }) => {
    const mailBuffer = mailserver.buffer(users.user1.email);

    await logNewUser(test, page, users.user1, { mailBuffer: mailBuffer });

    await activateEmail(test, page, users.user1, mailBuffer);

    mailBuffer.close();
});

test('Log and disable', async ({ page }) => {
    const mailBuffer = mailserver.buffer(users.user1.email);

    await logUser(test, page, users.user1, { mailBuffer: mailBuffer, mail2fa: true });

    await disableEmail(test, page, users.user1);

    mailBuffer.close();
});
