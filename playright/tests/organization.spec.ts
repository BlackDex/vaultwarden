import { test, expect, type TestInfo } from '../fixtures';
import { MailDev } from 'maildev';

import * as utils from "../global-utils";
import * as orgs from './setups/orgs';
import { createAccount, logUser } from './setups/user';

let users = utils.loadEnv();

test.beforeAll('Setup', async ({ browser }, testInfo: TestInfo) => {
    await utils.startVault(browser, testInfo);
});

test.afterAll('Teardown', async ({ }) => {
    await utils.stopVault();
});

test('Invite', async ({ page }) => {
    await createAccount(test, page, users.user3);
    await createAccount(test, page, users.user1);

    await orgs.create(test, page, 'New organisation');
    await orgs.members(test, page, 'New organisation');

    await test.step('missing user2', async () => {
        await orgs.invite(test, page, 'New organisation', users.user2.email);
        await expect(page.getByRole('row', { name: users.user2.email })).toHaveText(/Invited/);
    });

    await test.step('existing user3', async () => {
        await orgs.invite(test, page, 'New organisation', users.user3.email);
        await expect(page.getByRole('row', { name: users.user3.email })).toHaveText(/Needs confirmation/);
        await orgs.confirm(test, page, 'New organisation', users.user3.email);
    });

    await test.step('confirm user2', async () => {
        await createAccount(test, page, users.user2);
        await logUser(test, page, users.user1);
        await orgs.members(test, page, 'New organisation');
        await orgs.confirm(test, page, 'New organisation', users.user2.email);
    });

    await test.step('Org visible user2  ', async () => {
        await logUser(test, page, users.user2);
        await page.getByRole('button', { name: 'vault: New organisation', exact: true }).click();
        await expect(page.getByLabel('Filter: Default collection')).toBeVisible();
    });

    await test.step('Org visible user3  ', async () => {
        await logUser(test, page, users.user3);
        await page.getByRole('button', { name: 'vault: New organisation', exact: true }).click();
        await expect(page.getByLabel('Filter: Default collection')).toBeVisible();
    });
});

test('Policies', async ({ page }) => {
    await logUser(test, page, users.user1);
    await orgs.policies(test, page, 'New organisation');

    await test.step('Edited Single organisation', async () => {
        await page.getByRole('button', { name: 'Single organisation' }).click();
        await page.getByRole('checkbox', { name: 'Turn on' }).check();
        await page.getByRole('button', { name: 'Save' }).click();
        await utils.checkNotification(page, 'Success Edited policy Single organisation');
    });

    await test.step('Edited Enforce organisation data', async () => {
        await page.getByRole('button', { name: 'Enforce organisation data' }).click();
        await page.getByRole('checkbox', { name: 'Turn on' }).check();
        await page.getByRole('button', { name: 'Save' }).click();
        await utils.checkNotification(page, 'Success Edited policy Enforce organisation data ownership');
    });

    await test.step('Edited Master password requirements', async () => {
        await page.getByRole('button', { name: 'Master password requirements' }).click();
        await page.getByRole('checkbox', { name: 'Turn on' }).check();
        await page.getByRole('checkbox', { name: 'Require existing members to' }).check();
        await page.getByRole('combobox', { name: 'Minimum complexity score' }).click();
        await page.getByText('Weak (0)').click();
        await page.getByRole('button', { name: 'Save' }).click();
        await utils.checkNotification(page, 'Success Edited policy Master password requirements');
    });

    await test.step('Edited Single organisation', async () => {
        await page.getByRole('button', { name: 'Require two-step login' }).click();
        await page.getByRole('checkbox', { name: 'Turn on' }).check();
        await page.getByRole('button', { name: 'Save' }).click();
        await utils.checkNotification(page, 'Success Edited policy Require');
    });

    await test.step('Edited Remove Unlock with PIN', async () => {
        await page.getByRole('button', { name: 'Remove Unlock with PIN' }).click();
        await page.getByRole('checkbox', { name: 'Turn on' }).check();
        await page.getByRole('button', { name: 'Save' }).click();
        await utils.checkNotification(page, 'Success Edited policy Remove Unlock with PIN');
    });

    await test.step('Edited Password generator', async () => {
        await page.getByRole('button', { name: 'Password generator' }).click();
        await page.getByText('Turn on').click();
        await page.getByRole('combobox', { name: 'Password Type' }).click();
        await page.getByLabel('Options List').getByText('Password', { exact: true }).click();
        await page.getByRole('spinbutton', { name: 'Minimum length' }).click();
        await page.getByRole('spinbutton', { name: 'Minimum length' }).fill('8');
        await page.getByRole('spinbutton', { name: 'Minimum numbers' }).click();
        await page.getByRole('spinbutton', { name: 'Minimum numbers' }).fill('0');
        await page.getByRole('spinbutton', { name: 'Minimum special' }).click();
        await page.getByRole('spinbutton', { name: 'Minimum special' }).fill('0');
        await page.getByRole('checkbox', { name: 'A-Z', exact: true }).check();
        await page.getByRole('checkbox', { name: 'a-z', exact: true }).check();
        await page.getByRole('button', { name: 'Save' }).click();
        await utils.checkNotification(page, 'Success Edited policy Password generator');
    });

    await test.step('Edited Default URI match detection', async () => {
        await page.getByRole('button', { name: 'Default URI match detection' }).click();
        await page.getByRole('checkbox', { name: 'Turn on' }).check();
        await page.getByRole('button', { name: 'Save' }).click();
        await utils.checkNotification(page, 'Success Edited policy Default URI match detection');
    });

    await test.step('Edited Send options', async () => {
        await page.getByRole('button', { name: 'Send options' }).click();
        await page.getByRole('checkbox', { name: 'Turn on' }).check();
        await page.getByRole('checkbox', { name: 'Always show member’s email' }).check();
        await page.getByRole('button', { name: 'Save' }).click();
        await utils.checkNotification(page, 'Success Edited policy Send options');
    });

    await test.step('Edited Remove Send', async () => {
        await page.getByRole('button', { name: 'Remove Send' }).click();
        await page.getByRole('checkbox', { name: 'Turn on' }).check();
        await page.getByRole('button', { name: 'Save' }).click();
        await utils.checkNotification(page, 'Success Edited policy Remove Send');
    });

    await test.step('Edited Remove card item type', async () => {
        await page.getByRole('button', { name: 'Remove card item type' }).click();
        await page.getByRole('checkbox', { name: 'Turn on' }).check();
        await page.getByRole('button', { name: 'Save' }).click();
        await utils.checkNotification(page, 'Success Edited policy Remove card item type');
    });
});
