/* eslint-disable @typescript-eslint/no-require-imports */
const { test, expect } = require('@playwright/test');

test.describe('Adisearch Workspace browser certification baseline', () => {
  test('health endpoint reports a non-cacheable application-ready response', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('unconfigured root enters the local demo workspace and issue tabs navigate', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/demo\/team\/CORE\/all$/);
    await expect(page.getByRole('link', { name: 'All issues', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Active', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Backlog', exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Backlog', exact: true }).click();
    await expect(page).toHaveURL(/\/demo\/team\/CORE\/backlog$/);

    await page.getByRole('link', { name: 'Active', exact: true }).click();
    await expect(page).toHaveURL(/\/demo\/team\/CORE\/active$/);

    await page.getByRole('link', { name: 'All issues', exact: true }).click();
    await expect(page).toHaveURL(/\/demo\/team\/CORE\/all$/);
  });

  test('issue search opens, accepts input, clears, and closes with Escape', async ({ page }) => {
    await page.goto('/demo/team/CORE/all');

    await page.getByRole('button', { name: 'Search', exact: true }).click();
    const search = page.getByPlaceholder('Search issues...');
    await expect(search).toBeVisible();

    await search.fill('security');
    await expect(search).toHaveValue('security');

    await search.press('Escape');
    await expect(search).toHaveValue('');

    await search.press('Escape');
    await expect(search).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible();
  });

  test('unconfigured sign-in surface is truthful and routes to setup requirements', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Connect Supabase to continue' })).toBeVisible();
    await expect(page.getByText('This deployment is running without authentication credentials.')).toBeVisible();

    await page.getByRole('link', { name: 'View setup requirements' }).click();
    await expect(page).toHaveURL(/\/setup$/);
    await expect(page.getByRole('heading', { name: 'Supabase configuration required' })).toBeVisible();
  });

  test('unknown public route renders the product 404 recovery surface', async ({ page }) => {
    await page.goto('/login/this-route-does-not-exist');

    await expect(page.getByText('404', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to workspace' })).toBeVisible();
  });
});
