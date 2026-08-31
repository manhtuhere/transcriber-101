import { expect, test } from '@playwright/test'

test('authenticated user lands on /dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Your library' })).toBeVisible()
})

test('authenticated user is not redirected away from /upload', async ({ page }) => {
  await page.goto('/upload')
  await expect(page).toHaveURL(/\/upload$/)
})

test('the root path sends a signed-in user to the dashboard', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/dashboard$/)
})
