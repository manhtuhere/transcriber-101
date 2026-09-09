import { expect, test } from '@playwright/test'

test('signing out clears the session and returns to the login page', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Your library' })).toBeVisible()

  await page.getByRole('button', { name: /sign out/i }).click()

  // The redirect happens on the next protected render.
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
})

test("another user's book renders not-found rather than their data", async ({ page }) => {
  // A well-formed id that the signed-in user does not own. RLS returns no row,
  // so the page must not leak anything about it.
  await page.goto('/books/00000000-0000-0000-0000-000000000000')

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByText(/moby|chapter 1/i)).toHaveCount(0)
})
