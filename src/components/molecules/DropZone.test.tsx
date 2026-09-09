import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import DropZone from './DropZone'

const file = (name = 'book.txt') => new File(['hello'], name, { type: 'text/plain' })

function setup(props: Partial<Parameters<typeof DropZone>[0]> = {}) {
  const onSelect = vi.fn()
  render(
    <DropZone
      label="Book file"
      hint="Drop a .txt here."
      accept=".txt"
      onSelect={onSelect}
      {...props}
    />,
  )
  return { onSelect }
}

describe('DropZone', () => {
  // A div with a click handler would look identical and be unusable without a
  // mouse. The control has to be a real file input to keep that from happening.
  test('exposes a real file input, reachable by its label', () => {
    setup()
    const input = screen.getByLabelText(/book file/i)
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('accept', '.txt')
  })

  test('reports a file chosen through the picker', async () => {
    const { onSelect } = setup()
    await userEvent.upload(screen.getByLabelText(/book file/i), file())

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect.mock.calls[0]![0]).toHaveProperty('name', 'book.txt')
  })

  // The input is cleared after each change so the browser still fires one; a
  // reader who fixes a file and picks it again would otherwise get nothing.
  test('reports the same file twice if it is chosen twice', async () => {
    const { onSelect } = setup()
    const input = screen.getByLabelText(/book file/i)

    await userEvent.upload(input, file())
    await userEvent.upload(input, file())

    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  test('shows the hint until something is chosen, then what was chosen', () => {
    const { rerender } = render(
      <DropZone label="Book file" hint="Drop a .txt here." accept=".txt" onSelect={vi.fn()} />,
    )
    expect(screen.getByText('Drop a .txt here.')).toBeInTheDocument()

    rerender(
      <DropZone
        label="Book file"
        hint="Drop a .txt here."
        accept=".txt"
        chosen="book.txt"
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByText('book.txt')).toBeInTheDocument()
    expect(screen.queryByText('Drop a .txt here.')).not.toBeInTheDocument()
  })

  test('ignores a file dropped while disabled', async () => {
    const { onSelect } = setup({ disabled: true })
    expect(screen.getByLabelText(/book file/i)).toBeDisabled()
    await userEvent.upload(screen.getByLabelText(/book file/i), file())
    expect(onSelect).not.toHaveBeenCalled()
  })
})
