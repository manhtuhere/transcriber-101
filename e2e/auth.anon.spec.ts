import { expect, test } from '@playwright/test'

test('unauthenticated visit to /dashboard redirects to /login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('unauthenticated visit to /upload redirects to /login', async ({ page }) => {
  await page.goto('/upload')
  await expect(page).toHaveURL(/\/login$/)
})

test('the login page offers a magic-link form', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel(/email/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /send/i })).toBeVisible()
})
