import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import type { Database } from '../src/types/database'

const here = dirname(fileURLToPath(import.meta.url))
const BOOK = resolve(here, '../test/fixtures/book.txt')

const admin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const created: string[] = []

// Each run leaves the library as it found it, so the dashboard assertions stay
// meaningful on a repeat run.
test.afterEach(async () => {
  while (created.length > 0) {
    await admin.from('books').delete().eq('id', created.pop()!)
  }
})

async function queueBook(page: Page, title: string) {
  await page.goto('/upload')
  await page.getByLabel(/book file/i).setInputFiles(BOOK)
  await page.getByLabel(/^title/i).fill(title)
  await page.getByLabel(/^author/i).fill('A Test Author')
  await page.getByRole('button', { name: /save & queue/i }).click()

  await page.waitForURL(/\/books\/[0-9a-f-]{36}$/)
  const id = page.url().split('/').pop()!
  created.push(id)
  return id
}

test('queueing a book creates it with all chapters pending', async ({ page }) => {
  const title = `E2E Queue ${Date.now()}`
  await queueBook(page, title)

  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByText(/0 of 3 chapters ready/i)).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(3)
})

test('the queued book appears on the dashboard as Processing', async ({ page }) => {
  const title = `E2E Dash ${Date.now()}`
  await queueBook(page, title)

  await page.goto('/dashboard')
  const card = page.getByRole('article').filter({ hasText: title })
  await expect(card).toBeVisible()
  await expect(card.getByText('Processing')).toBeVisible()
  await expect(card.getByText(/3 chapters/)).toBeVisible()
})

test('a queued book is not yet listenable', async ({ page }) => {
  const title = `E2E Unready ${Date.now()}`
  await queueBook(page, title)

  await page.goto('/dashboard')
  const card = page.getByRole('article').filter({ hasText: title })
  await expect(card.getByRole('link', { name: /listen/i })).toHaveCount(0)
})
