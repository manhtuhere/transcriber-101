import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../test/renderWithProviders'
import { MAX_BOOK_CHARS, MAX_UPLOAD_BYTES } from '../constants/upload'
import Upload from './Upload'

const navigate = vi.fn()
vi.mock('@tanstack/react-router', async (original) => {
  const actual = await original<Record<string, unknown>>()
  return { ...actual, useNavigate: () => navigate }
})

vi.mock('../lib/api', () => ({ createBook: vi.fn(), uploadCover: vi.fn() }))
const api = vi.mocked(await import('../lib/api'))

const here = dirname(fileURLToPath(import.meta.url))
const bookText = readFileSync(resolve(here, '../../test/fixtures/book.txt'), 'utf8')

const textFile = (content: string = bookText, name = 'book.txt') =>
  new File([content], name, { type: 'text/plain' })

// applyAccept: false bypasses user-event's own filtering of the accept
// attribute. In a real browser accept is only a picker hint — a user can pick
// "All files" and choose a PDF anyway — so the component's guard is what
// actually rejects it, and that is what these tests exercise.
async function dropBook(file: File = textFile()) {
  await userEvent.upload(screen.getByLabelText(/book file/i), file, { applyAccept: false })
}

const chapterRows = () =>
  screen.queryAllByRole('row').filter((row) => within(row).queryByRole('textbox'))

beforeEach(() => vi.clearAllMocks())

describe('Upload preview', () => {
  test('shows an empty state before a file is chosen', async () => {
    await renderWithProviders(<Upload />)
    expect(screen.getByText(/chapters will be listed here/i)).toBeInTheDocument()
    expect(chapterRows()).toHaveLength(0)
  })

  test('renders one row per chapter after a file is dropped', async () => {
    await renderWithProviders(<Upload />)
    await dropBook()

    expect(await screen.findByLabelText('Chapter 1 title')).toHaveValue('Chapter One')
    expect(chapterRows()).toHaveLength(3)
    expect(screen.getByLabelText('Chapter 3 title')).toHaveValue('Chapter Three')
  })

  test('shows per-chapter character counts', async () => {
    await renderWithProviders(<Upload />)
    await dropBook()

    const row = (await screen.findByLabelText('Chapter 1 title')).closest('tr')!
    expect(within(row).getByTestId('char-count')).toHaveTextContent(
      String('It was a dark and stormy night.\nThe wind howled.'.length),
    )
  })

  test('shows total cost and estimated runtime for the whole book', async () => {
    await renderWithProviders(<Upload />)
    await dropBook()

    expect(await screen.findByTestId('cost-estimate')).toHaveTextContent(/^\$\d/)
    // The fixture is small enough to hit the runtime floor, which reads
    // "under a minute" — so assert a human duration, not a digit.
    expect(screen.getByTestId('runtime-estimate')).toHaveTextContent(/minute|min|h/i)
  })

  test('editing a chapter title updates that row only', async () => {
    await renderWithProviders(<Upload />)
    await dropBook()

    const first = await screen.findByLabelText('Chapter 1 title')
    await userEvent.clear(first)
    await userEvent.type(first, 'Renamed')

    expect(first).toHaveValue('Renamed')
    expect(screen.getByLabelText('Chapter 2 title')).toHaveValue('Chapter Two')
  })

  test('removing a chapter renumbers the remaining rows contiguously', async () => {
    await renderWithProviders(<Upload />)
    await dropBook()
    await screen.findByLabelText('Chapter 1 title')

    await userEvent.click(screen.getByRole('button', { name: /remove chapter 1/i }))

    expect(chapterRows()).toHaveLength(2)
    expect(screen.getByLabelText('Chapter 1 title')).toHaveValue('Chapter Two')
    expect(screen.getByLabelText('Chapter 2 title')).toHaveValue('Chapter Three')
    expect(screen.queryByLabelText('Chapter 3 title')).not.toBeInTheDocument()
  })

  test('rejects a non-text file with a visible error and renders no rows', async () => {
    await renderWithProviders(<Upload />)
    await dropBook(new File(['%PDF-1.4'], 'book.pdf', { type: 'application/pdf' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/\.txt or \.md/i)
    expect(chapterRows()).toHaveLength(0)
  })

  test('rejects a file over the size cap with a visible error', async () => {
    await renderWithProviders(<Upload />)
    await dropBook(textFile('x'.repeat(MAX_UPLOAD_BYTES + 1), 'huge.txt'))

    expect(await screen.findByRole('alert')).toHaveTextContent(/too large/i)
    expect(chapterRows()).toHaveLength(0)
  })

  test('disables the queue button until title and author are filled', async () => {
    await renderWithProviders(<Upload />)
    await dropBook()
    await screen.findByLabelText('Chapter 1 title')

    const queue = screen.getByRole('button', { name: /save & queue/i })
    expect(queue).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/^title/i), 'My Book')
    expect(queue).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/^author/i), 'Someone')
    expect(queue).toBeEnabled()
  })

  test('rejects a book over the character cap before any write', async () => {
    await renderWithProviders(<Upload />)
    // Under the byte cap, over the character cap.
    await dropBook(textFile('a'.repeat(MAX_BOOK_CHARS + 1), 'long.txt'))

    expect(await screen.findByRole('alert')).toHaveTextContent(/over the .* limit/i)
    expect(chapterRows()).toHaveLength(0)
    expect(api.createBook).not.toHaveBeenCalled()
  })

  test('does not call createBook on parse alone', async () => {
    await renderWithProviders(<Upload />)
    await dropBook()
    await screen.findByLabelText('Chapter 1 title')

    expect(api.createBook).not.toHaveBeenCalled()
  })
})

describe('Upload queueing', () => {
  async function fillAndQueue() {
    await renderWithProviders(<Upload />)
    await dropBook()
    await screen.findByLabelText('Chapter 1 title')
    await userEvent.type(screen.getByLabelText(/^title/i), 'My Book')
    await userEvent.type(screen.getByLabelText(/^author/i), 'Someone')
    await userEvent.click(screen.getByRole('button', { name: /save & queue/i }))
  }

  test('clicking Save & queue calls createBook once with the built draft', async () => {
    api.createBook.mockResolvedValue('new-book-id')
    await fillAndQueue()

    await waitFor(() => expect(api.createBook).toHaveBeenCalledTimes(1))
    const draft = api.createBook.mock.calls[0]![0]
    expect(draft.book).toMatchObject({ title: 'My Book', author: 'Someone', status: 'processing' })
    expect(draft.chapters).toHaveLength(3)
    expect(draft.chapters.every((c) => c.status === 'pending')).toBe(true)
  })

  test('navigates to the new book on success', async () => {
    api.createBook.mockResolvedValue('new-book-id')
    await fillAndQueue()

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/books/$id',
        params: { id: 'new-book-id' },
      }),
    )
  })

  test('shows an error and stays on the page when createBook rejects', async () => {
    api.createBook.mockRejectedValue(new Error('insert failed'))
    await fillAndQueue()

    expect(await screen.findByRole('alert')).toHaveTextContent(/insert failed/i)
    expect(navigate).not.toHaveBeenCalled()
  })

  test('a second click does not create a second book', async () => {
    // Never resolves: the button must stay disabled while in flight.
    api.createBook.mockReturnValue(new Promise(() => {}))
    await fillAndQueue()

    const queue = screen.getByRole('button', { name: /queue|saving/i })
    expect(queue).toBeDisabled()
    await userEvent.click(queue)

    expect(api.createBook).toHaveBeenCalledTimes(1)
  })
})

describe('Cover on upload', () => {
  const fill = async () => {
    await dropBook()
    await userEvent.type(await screen.findByLabelText(/^title/i), 'Moby-Dick')
    await userEvent.type(screen.getByLabelText(/^author/i), 'Melville')
  }

  const coverFile = () =>
    new File([new Uint8Array(10)], 'cover.jpg', { type: 'image/jpeg' })

  test('a book can be queued without one', async () => {
    api.createBook.mockResolvedValue('b1')
    await renderWithProviders(<Upload />)
    await fill()
    await userEvent.click(screen.getByRole('button', { name: /save & queue/i }))

    await waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(api.uploadCover).not.toHaveBeenCalled()
  })

  // The storage path is keyed by book id, so there is nothing to upload against
  // until the insert comes back.
  test('uploads the cover after the book exists, against the new id', async () => {
    api.createBook.mockResolvedValue('b7')
    api.uploadCover.mockResolvedValue(undefined)
    await renderWithProviders(<Upload />)
    await fill()

    const cover = coverFile()
    await userEvent.upload(screen.getByLabelText(/cover/i), cover, { applyAccept: false })
    await userEvent.click(screen.getByRole('button', { name: /save & queue/i }))

    await waitFor(() => expect(api.uploadCover).toHaveBeenCalledWith('b7', cover))
    expect(api.createBook).toHaveBeenCalledBefore(api.uploadCover)
  })

  // The transcript is already queued by then. Sending the reader back to a form
  // that would queue it again would be worse than a missing cover.
  test('still opens the book when the cover fails to upload', async () => {
    api.createBook.mockResolvedValue('b7')
    api.uploadCover.mockRejectedValue(new Error('storage is full'))
    await renderWithProviders(<Upload />)
    await fill()

    await userEvent.upload(screen.getByLabelText(/cover/i), coverFile(), { applyAccept: false })
    await userEvent.click(screen.getByRole('button', { name: /save & queue/i }))

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: '/books/$id', params: { id: 'b7' } }),
    )
  })
})

describe('A file too large to accept', () => {
  /*
    The guard that keeps a 50 MB drop from freezing the tab. `file.text()`
    decodes the whole thing into a string before returning, so reading first
    and checking the size afterwards would block for seconds on a file that
    was never going to be accepted. `test/stress` measures what that costs;
    this pins the ordering that avoids paying it.
  */
  test('is rejected without ever being read', async () => {
    const huge = new File(['x'], 'huge.txt', { type: 'text/plain' })
    Object.defineProperty(huge, 'size', { value: 50 * 1024 * 1024 })
    const read = vi.spyOn(huge, 'text')

    await renderWithProviders(<Upload />)
    await dropBook(huge)

    expect(await screen.findByText(/too large/i)).toBeInTheDocument()
    expect(read).not.toHaveBeenCalled()
  })

  test('says what the limit is, so the message is actionable', async () => {
    const huge = new File(['x'], 'huge.txt', { type: 'text/plain' })
    Object.defineProperty(huge, 'size', { value: MAX_UPLOAD_BYTES + 1 })

    await renderWithProviders(<Upload />)
    await dropBook(huge)

    expect(await screen.findByText(/limit is 5 MB/i)).toBeInTheDocument()
  })

  test('leaves no half-parsed chapters behind', async () => {
    await renderWithProviders(<Upload />)
    await dropBook()
    expect(await screen.findByLabelText('Chapter 1 title')).toBeInTheDocument()

    const huge = new File(['x'], 'huge.txt', { type: 'text/plain' })
    Object.defineProperty(huge, 'size', { value: 50 * 1024 * 1024 })
    await dropBook(huge)

    expect(chapterRows()).toHaveLength(0)
  })
})
