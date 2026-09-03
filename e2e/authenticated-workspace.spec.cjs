/* eslint-disable @typescript-eslint/no-require-imports */
const { test, expect } = require('@playwright/test');

const APP_ORIGIN = 'http://127.0.0.1:3000';

function requiredSecret(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for authenticated E2E certification.`);
  return value;
}

async function signIn(page, email, password) {
  await page.goto(`${APP_ORIGIN}/login`);
  await expect(page.getByLabel('Work email')).toBeVisible();
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in securely' }).click();
  await page.waitForURL(
    (url) => url.pathname === '/onboarding' || /^\/[^/]+\/team\/CORE\/all$/.test(url.pathname),
    { timeout: 20_000 }
  );

  const path = new URL(page.url()).pathname;
  if (path === '/onboarding') {
    throw new Error('E2E account has no workspace. Create an isolated workspace for this test identity first.');
  }
  const match = path.match(/^\/([^/]+)\/team\/CORE\/all$/);
  if (!match) throw new Error(`Unexpected post-login route: ${path}`);
  return match[1];
}

async function json(response) {
  return response.json().catch(() => ({}));
}

async function mutation(page, method, path, data) {
  return page.request.fetch(`${APP_ORIGIN}${path}`, {
    method,
    data,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: APP_ORIGIN,
    },
  });
}

test('authenticated persistence, CRUD, and tenant isolation are enforced end to end', async ({ browser }) => {
  const primaryEmail = requiredSecret('E2E_PRIMARY_EMAIL');
  const primaryPassword = requiredSecret('E2E_PRIMARY_PASSWORD');
  const secondaryEmail = requiredSecret('E2E_SECONDARY_EMAIL');
  const secondaryPassword = requiredSecret('E2E_SECONDARY_PASSWORD');

  const primaryContext = await browser.newContext({ baseURL: APP_ORIGIN });
  const secondaryContext = await browser.newContext({ baseURL: APP_ORIGIN });
  const primaryPage = await primaryContext.newPage();
  const secondaryPage = await secondaryContext.newPage();

  let originalProfile = null;
  let originalWorkspace = null;
  let primarySlug = null;
  let createdIssueId = null;

  try {
    await primaryPage.goto(`${APP_ORIGIN}/`);
    await expect(primaryPage).toHaveURL(/\/login(?:\?.*)?$/);

    primarySlug = await signIn(primaryPage, primaryEmail, primaryPassword);
    const secondarySlug = await signIn(secondaryPage, secondaryEmail, secondaryPassword);
    expect(primarySlug).not.toBe(secondarySlug);

    // Cross-tenant reads must never succeed in either direction.
    const primaryReadsSecondary = await primaryPage.request.get(
      `${APP_ORIGIN}/api/issues?organization=${encodeURIComponent(secondarySlug)}`
    );
    expect([403, 404]).toContain(primaryReadsSecondary.status());

    const secondaryReadsPrimary = await secondaryPage.request.get(
      `${APP_ORIGIN}/api/issues?organization=${encodeURIComponent(primarySlug)}`
    );
    expect([403, 404]).toContain(secondaryReadsPrimary.status());

    // R6A: profile settings persist through the real UI and survive reload.
    const profileResponse = await primaryPage.request.get(`${APP_ORIGIN}/api/profile`);
    expect(profileResponse.status()).toBe(200);
    originalProfile = (await json(profileResponse)).profile;
    expect(originalProfile).toBeTruthy();

    const unique = Date.now().toString(36);
    const nextDisplayName = `E2E Primary ${unique}`;
    const nextTimezone = 'Africa/Nairobi';

    await primaryPage.goto(`${APP_ORIGIN}/${primarySlug}/settings/profile`);
    await primaryPage.getByLabel('Display name').fill(nextDisplayName);
    await primaryPage.getByLabel('Time zone').fill(nextTimezone);
    const profileSave = primaryPage.waitForResponse(
      (response) =>
        response.url().endsWith('/api/profile') && response.request().method() === 'PATCH'
    );
    await primaryPage.getByRole('button', { name: 'Save profile' }).click();
    expect((await profileSave).status()).toBe(200);
    await primaryPage.reload();
    await expect(primaryPage.getByLabel('Display name')).toHaveValue(nextDisplayName);
    await expect(primaryPage.getByLabel('Time zone')).toHaveValue(nextTimezone);

    // R6B: authoritative workspace name persists and the slug stays immutable.
    const workspaceResponse = await primaryPage.request.get(
      `${APP_ORIGIN}/api/workspace-settings?organization=${encodeURIComponent(primarySlug)}`
    );
    expect(workspaceResponse.status()).toBe(200);
    const workspacePayload = await json(workspaceResponse);
    originalWorkspace = workspacePayload.workspace;
    expect(originalWorkspace).toBeTruthy();
    if (!workspacePayload.canManage) {
      throw new Error('Primary E2E account must be an owner or admin of its isolated workspace.');
    }

    const nextWorkspaceName = `E2E Workspace ${unique}`;
    await primaryPage.goto(`${APP_ORIGIN}/${primarySlug}/settings/workspace`);
    await primaryPage.getByLabel('Workspace name').fill(nextWorkspaceName);
    const workspaceSave = primaryPage.waitForResponse(
      (response) =>
        response.url().includes('/api/workspace-settings?') &&
        response.request().method() === 'PATCH'
    );
    await primaryPage.getByRole('button', { name: 'Save workspace' }).click();
    expect((await workspaceSave).status()).toBe(200);
    await primaryPage.reload();
    await expect(primaryPage.getByLabel('Workspace name')).toHaveValue(nextWorkspaceName);
    await expect(primaryPage.getByLabel('Workspace URL slug')).toHaveValue(primarySlug);

    // R1: issue lifecycle is persisted through authenticated app APIs and visible in the UI.
    const issueTitle = `R8 E2E ${unique}`;
    const createResponse = await mutation(primaryPage, 'POST', '/api/issues', {
      organizationSlug: primarySlug,
      teamKey: 'CORE',
      title: issueTitle,
      description: 'Created by the R8 authenticated browser certification suite.',
      statusSlug: 'to-do',
      priority: 'medium',
      labelIds: [],
    });
    expect(createResponse.status()).toBe(201);
    const createPayload = await json(createResponse);
    createdIssueId = createPayload.issue?.id ?? null;
    expect(createdIssueId).toBeTruthy();

    await primaryPage.goto(`${APP_ORIGIN}/${primarySlug}/team/CORE/all`);
    await primaryPage.getByRole('button', { name: 'Search', exact: true }).click();
    const search = primaryPage.getByPlaceholder('Search issues...');
    await search.fill(issueTitle);
    await expect(primaryPage.getByText(issueTitle, { exact: true })).toBeVisible();

    const updatedTitle = `${issueTitle} updated`;
    const updateResponse = await mutation(
      primaryPage,
      'PATCH',
      `/api/issues/${createdIssueId}`,
      { title: updatedTitle, statusSlug: 'in-progress', priority: 'high' }
    );
    expect(updateResponse.status()).toBe(204);

    const listResponse = await primaryPage.request.get(
      `${APP_ORIGIN}/api/issues?organization=${encodeURIComponent(primarySlug)}`
    );
    expect(listResponse.status()).toBe(200);
    const listedIssues = (await json(listResponse)).issues ?? [];
    const persistedIssue = listedIssues.find((issue) => issue.id === createdIssueId);
    expect(persistedIssue).toMatchObject({
      title: updatedTitle,
      statusId: 'in-progress',
      priorityId: 'high',
    });

    // Cross-tenant mutation of a known primary resource must also be denied.
    const secondaryMutatesPrimary = await mutation(
      secondaryPage,
      'PATCH',
      `/api/issues/${createdIssueId}`,
      { title: 'cross-tenant mutation must not succeed' }
    );
    expect([403, 404]).toContain(secondaryMutatesPrimary.status());

    const secondaryReadsPrimarySettings = await secondaryPage.request.get(
      `${APP_ORIGIN}/api/workspace-settings?organization=${encodeURIComponent(primarySlug)}`
    );
    expect([403, 404]).toContain(secondaryReadsPrimarySettings.status());
  } finally {
    if (createdIssueId) {
      await mutation(primaryPage, 'DELETE', `/api/issues/${createdIssueId}`, undefined).catch(() => {});
    }

    if (primarySlug && originalWorkspace?.name) {
      await mutation(
        primaryPage,
        'PATCH',
        `/api/workspace-settings?organization=${encodeURIComponent(primarySlug)}`,
        { name: originalWorkspace.name }
      ).catch(() => {});
    }

    if (originalProfile?.displayName && originalProfile?.timezone) {
      await mutation(primaryPage, 'PATCH', '/api/profile', {
        displayName: originalProfile.displayName,
        timezone: originalProfile.timezone,
      }).catch(() => {});
    }

    await primaryContext.close();
    await secondaryContext.close();
  }
});
