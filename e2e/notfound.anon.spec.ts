import { expect, test } from '@playwright/test'

test('an unknown path renders the not-found page', async ({ page }) => {
  await page.goto('/no-such-page')
  await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible()
})

test('the not-found page links back to the library', async ({ page }) => {
  await page.goto('/no-such-page')
  await expect(page.getByRole('link', { name: /library/i })).toBeVisible()
})
