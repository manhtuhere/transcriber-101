import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, test, vi } from 'vitest'
import { MAX_COVER_BYTES } from '../../constants/upload'
import CoverPicker from './CoverPicker'

// jsdom implements neither object URL, so the preview needs both stubbed.
beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:cover')
  URL.revokeObjectURL = vi.fn()
})

const image = (type = 'image/jpeg', bytes = 1000) =>
  new File([new Uint8Array(bytes)], 'cover.jpg', { type })

async function choose(file: File) {
  // applyAccept: false — accept is only a picker hint in a real browser, so the
  // component's own guard is what has to reject the file.
  await userEvent.upload(screen.getByLabelText(/cover/i), file, { applyAccept: false })
}

describe('CoverPicker', () => {
  test('offers a drop zone when there is no cover yet', () => {
    render(<CoverPicker onSelect={vi.fn()} />)
    expect(screen.getByLabelText(/cover/i)).toHaveAttribute('type', 'file')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  test('previews the chosen image and reports it', async () => {
    const onSelect = vi.fn()
    render(<CoverPicker onSelect={onSelect} />)
    await choose(image())

    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:cover')
    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect.mock.calls[0]![0]).toHaveProperty('type', 'image/jpeg')
  })

  test('refuses a format the bucket will not take, and reports nothing', async () => {
    const onSelect = vi.fn()
    render(<CoverPicker onSelect={onSelect} />)
    await choose(new File(['x'], 'cover.gif', { type: 'image/gif' }))

    expect(screen.getByText(/not supported/i)).toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
  })

  // Checked here as well as by Storage, so the reader is told before a slow
  // upload starts rather than after it fails.
  test('refuses an image over the size limit', async () => {
    const onSelect = vi.fn()
    render(<CoverPicker onSelect={onSelect} />)
    await choose(image('image/png', MAX_COVER_BYTES + 1))

    expect(screen.getByText(/over the 3 MB limit/i)).toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
  })

  test('shows a cover already stored, without a preview of its own', () => {
    render(<CoverPicker currentUrl="https://example.test/c.jpg" onSelect={vi.fn()} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.test/c.jpg')
    expect(screen.getByText(/current cover/i)).toBeInTheDocument()
  })

  test('clearing reports null and puts the drop zone back', async () => {
    const onSelect = vi.fn()
    const onRemove = vi.fn()
    render(<CoverPicker onSelect={onSelect} onRemove={onRemove} />)

    await choose(image())
    await userEvent.click(screen.getByRole('button', { name: /remove cover/i }))

    expect(onSelect).toHaveBeenLastCalledWith(null)
    expect(onRemove).toHaveBeenCalledOnce()
    expect(screen.getByLabelText(/cover/i)).toHaveAttribute('type', 'file')
  })

  // An object URL pins the file in memory until it is released.
  test('releases the preview URL when it goes away', async () => {
    const { unmount } = render(<CoverPicker onSelect={vi.fn()} />)
    await choose(image())
    unmount()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cover')
  })
})
