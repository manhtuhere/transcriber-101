import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../test/renderWithProviders'
import type { BookSummary } from '../types/book'
import Dashboard from './Dashboard'

vi.mock('../lib/api', () => ({ listBooks: vi.fn() }))
const api = vi.mocked(await import('../lib/api'))

const book = (over: Partial<BookSummary> = {}): BookSummary =>
  ({
    id: 'b1',
    title: 'Moby Dick',
    author: 'Herman Melville',
    status: 'ready',
    total_duration_sec: 7325,
    created_at: '2026-08-01T00:00:00Z',
    chapters: [{ count: 12 }],
    ...over,
  }) as BookSummary

beforeEach(() => vi.clearAllMocks())

describe('Dashboard', () => {
  test('renders an empty state when there are no books', async () => {
    api.listBooks.mockResolvedValue([])
    await renderWithProviders(<Dashboard />)
    expect(await screen.findByText(/no books yet/i)).toBeInTheDocument()
  })

  test('renders one card per book', async () => {
    api.listBooks.mockResolvedValue([book(), book({ id: 'b2', title: 'Ulysses' })])
    await renderWithProviders(<Dashboard />)
    expect(await screen.findAllByRole('article')).toHaveLength(2)
  })

  test('a card shows title, author and chapter count', async () => {
    api.listBooks.mockResolvedValue([book()])
    await renderWithProviders(<Dashboard />)

    expect(await screen.findByRole('heading', { name: 'Moby Dick' })).toBeInTheDocument()
    expect(screen.getByText('Herman Melville')).toBeInTheDocument()
    expect(screen.getByText(/12 chapters/)).toBeInTheDocument()
  })

  test('a ready book shows its total duration and a play link', async () => {
    api.listBooks.mockResolvedValue([book()])
    await renderWithProviders(<Dashboard />)

    // Shelf units, not a timecode: you are choosing a book, not navigating one.
    expect(await screen.findByText('2 hr 2 min')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /listen/i })).toHaveAttribute(
      'href',
      '/books/b1/listen',
    )
  })

  test('a processing book shows a Processing badge and no play link', async () => {
    api.listBooks.mockResolvedValue([book({ status: 'processing', total_duration_sec: null })])
    await renderWithProviders(<Dashboard />)

    expect(await screen.findByText(/processing/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /listen/i })).not.toBeInTheDocument()
  })

  test('a failed book shows a Failed badge', async () => {
    api.listBooks.mockResolvedValue([book({ status: 'failed' })])
    await renderWithProviders(<Dashboard />)
    expect(await screen.findByText(/failed/i)).toBeInTheDocument()
  })

  test('shows a loading state while books are being fetched', async () => {
    api.listBooks.mockReturnValue(new Promise(() => {}))
    await renderWithProviders(<Dashboard />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  test('shows an error state when listBooks rejects', async () => {
    api.listBooks.mockRejectedValue(new Error('network down'))
    await renderWithProviders(<Dashboard />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/network down/i)
  })
})
