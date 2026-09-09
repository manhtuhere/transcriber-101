import { expect, test, type Page } from '@playwright/test'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const BOOK = resolve(here, '../test/fixtures/book.txt')

const chapterRows = (page: Page) => page.locator('tbody tr')

test('uploading a text file shows its chapters', async ({ page }) => {
  await page.goto('/upload')
  await page.getByLabel(/book file/i).setInputFiles(BOOK)

  await expect(chapterRows(page)).toHaveCount(3)
  await expect(page.getByLabel('Chapter 1 title')).toHaveValue('Chapter One')
  await expect(page.getByLabel('Chapter 3 title')).toHaveValue('Chapter Three')
})

test('the cost estimate is visible before queueing', async ({ page }) => {
  await page.goto('/upload')
  await page.getByLabel(/book file/i).setInputFiles(BOOK)

  await expect(page.getByTestId('cost-estimate')).toContainText('$')
  await expect(page.getByTestId('runtime-estimate')).not.toBeEmpty()
})

test('an unsupported file type shows an error and no chapter rows', async ({ page }) => {
  await page.goto('/upload')
  await page.getByLabel(/book file/i).setInputFiles({
    name: 'book.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
  })

  await expect(page.getByRole('alert')).toContainText(/\.txt or \.md/i)
  await expect(chapterRows(page)).toHaveCount(0)
})

test('the queue button is disabled until metadata is complete', async ({ page }) => {
  await page.goto('/upload')
  await page.getByLabel(/book file/i).setInputFiles(BOOK)

  const queue = page.getByRole('button', { name: /save & queue/i })
  await expect(queue).toBeDisabled()

  await page.getByLabel(/^title/i).fill('My Book')
  await expect(queue).toBeDisabled()

  await page.getByLabel(/^author/i).fill('Someone')
  await expect(queue).toBeEnabled()
})

test('removing a chapter renumbers the rest', async ({ page }) => {
  await page.goto('/upload')
  await page.getByLabel(/book file/i).setInputFiles(BOOK)
  await expect(chapterRows(page)).toHaveCount(3)

  await page.getByRole('button', { name: /remove chapter 1/i }).click()

  await expect(chapterRows(page)).toHaveCount(2)
  await expect(page.getByLabel('Chapter 1 title')).toHaveValue('Chapter Two')
})
