import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../test/renderWithProviders'
import type { BookWithChapters, Chapter } from '../types/book'
import BookDetail from './BookDetail'

vi.mock('../lib/api', () => ({
  getBook: vi.fn(),
  retryChapter: vi.fn(),
  subscribeToChapters: vi.fn(() => () => {}),
}))
const api = vi.mocked(await import('../lib/api'))

const chapter = (idx: number, over: Partial<Chapter> = {}): Chapter =>
  ({
    id: `c${idx}`,
    book_id: 'b1',
    idx,
    title: `Chapter ${idx + 1}`,
    status: 'ready',
    duration_sec: 120,
    error: null,
    ...over,
  }) as Chapter

const book = (chapters: Chapter[], status = 'processing'): BookWithChapters =>
  ({ id: 'b1', title: 'Moby Dick', author: 'H. M.', status, chapters }) as BookWithChapters

async function render() {
  return renderWithProviders(<BookDetail />, { route: '/books/b1', path: '/books/$id' })
}

beforeEach(() => {
  vi.clearAllMocks()
  api.subscribeToChapters.mockReturnValue(() => {})
})

describe('BookDetail', () => {
  test('shows a progress summary of ready over total chapters', async () => {
    api.getBook.mockResolvedValue(
      book([chapter(0), chapter(1), chapter(2, { status: 'pending', duration_sec: null })]),
    )
    await render()
    expect(await screen.findByText(/2 of 3 chapters ready/i)).toBeInTheDocument()
  })

  test('renders a status badge per chapter', async () => {
    api.getBook.mockResolvedValue(
      book([chapter(0), chapter(1, { status: 'pending', duration_sec: null })]),
    )
    await render()
    expect(await screen.findByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  test('shows the error text on a failed chapter', async () => {
    api.getBook.mockResolvedValue(
      book([chapter(0, { status: 'failed', error: 'Deepgram 500' })]),
    )
    await render()
    expect(await screen.findByText(/deepgram 500/i)).toBeInTheDocument()
  })

  test('a failed chapter has a Retry button', async () => {
    api.getBook.mockResolvedValue(book([chapter(0, { status: 'failed', error: 'boom' })]))
    await render()
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  test('a ready chapter has no Retry button', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    await render()
    await screen.findByText('Ready')
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  test('clicking Retry calls retryChapter with that chapter id', async () => {
    api.getBook.mockResolvedValue(book([chapter(0, { status: 'failed', error: 'boom' })]))
    api.retryChapter.mockResolvedValue(undefined)
    await render()

    await userEvent.click(await screen.findByRole('button', { name: /retry/i }))
    await waitFor(() => expect(api.retryChapter).toHaveBeenCalledWith('c0'))
  })

  test('refetches after a successful retry so the badge updates', async () => {
    api.getBook
      .mockResolvedValueOnce(book([chapter(0, { status: 'failed', error: 'boom' })]))
      .mockResolvedValue(book([chapter(0, { status: 'pending', duration_sec: null })]))
    api.retryChapter.mockResolvedValue(undefined)
    await render()

    await userEvent.click(await screen.findByRole('button', { name: /retry/i }))
    expect(await screen.findByText('Pending')).toBeInTheDocument()
  })

  test('subscribes to realtime chapter updates for this book', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    await render()
    await waitFor(() => expect(api.subscribeToChapters).toHaveBeenCalledWith('b1', expect.any(Function)))
  })

  test('a realtime notification refetches the book', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)]))
    await render()
    await screen.findByText('Ready')

    const notify = api.subscribeToChapters.mock.calls[0]![1]
    api.getBook.mockResolvedValue(book([chapter(0, { status: 'failed', error: 'later boom' })]))
    notify()

    expect(await screen.findByText(/later boom/i)).toBeInTheDocument()
  })

  test('unsubscribes on unmount', async () => {
    const unsubscribe = vi.fn()
    api.subscribeToChapters.mockReturnValue(unsubscribe)
    api.getBook.mockResolvedValue(book([chapter(0)]))

    const { unmount } = await render()
    await screen.findByText('Ready')
    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })

  test('shows a Listen link once the book is ready', async () => {
    api.getBook.mockResolvedValue(book([chapter(0)], 'ready'))
    await render()
    expect(await screen.findByRole('link', { name: /listen/i })).toHaveAttribute(
      'href',
      '/books/b1/listen',
    )
  })

  test('shows a failed banner when the book itself is failed', async () => {
    api.getBook.mockResolvedValue(book([chapter(0, { status: 'failed', error: 'x' })], 'failed'))
    await render()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
