import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Extend the base Playwright test to strip the `cross-origin-resource-policy`
 * header from all responses. This allows the Playwright UI to render the site
 * without CORP blocking cross-origin resource loads.
 */
export const test = base.extend<{ page: Page }>({
    page: async ({ page }, use) => {
        await page.route('**/*', async (route) => {
            const response = await route.fetch();
            const headers = { ...response.headers() };
            // Allow cross-origin to let the PlayWright UI work
            headers['cross-origin-resource-policy'] = 'cross-origin';
            await route.fulfill({ response, headers });
        });

        await use(page);
        await page.unrouteAll({ behavior: 'ignoreErrors' });
    },
});

export { expect };
export * from '@playwright/test';
