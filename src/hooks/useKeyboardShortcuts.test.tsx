import { fireEvent, renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

let play: Mock<() => void>
let forward: Mock<() => void>

function bind(enabled = true) {
  return renderHook(() =>
    useKeyboardShortcuts({ ' ': play, arrowright: forward, k: play }, enabled),
  )
}

beforeEach(() => {
  play = vi.fn<() => void>()
  forward = vi.fn<() => void>()
  document.body.innerHTML = ''
})

describe('useKeyboardShortcuts', () => {
  test('runs the handler for a bound key', async () => {
    bind()
    await userEvent.keyboard(' ')
    expect(play).toHaveBeenCalledTimes(1)
  })

  test('matches letters regardless of case', async () => {
    bind()
    await userEvent.keyboard('K')
    expect(play).toHaveBeenCalledTimes(1)
  })

  test('matches named keys like the arrows', async () => {
    bind()
    await userEvent.keyboard('{ArrowRight}')
    expect(forward).toHaveBeenCalledTimes(1)
  })

  test('ignores keys that are not bound', async () => {
    bind()
    await userEvent.keyboard('z')
    expect(play).not.toHaveBeenCalled()
  })

  /*
    The guard that matters most. Without it, typing a book title into the
    search box would skip and pause the player on every space.
  */
  test('stays out of the way while typing in a text field', async () => {
    bind()
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()

    await userEvent.keyboard('Moby Dick')
    expect(play).not.toHaveBeenCalled()
  })

  test('stays out of the way in a textarea', async () => {
    bind()
    const area = document.createElement('textarea')
    document.body.append(area)
    area.focus()

    await userEvent.keyboard(' ')
    expect(play).not.toHaveBeenCalled()
  })

  /*
    jsdom implements almost none of contenteditable: assigning
    `el.contentEditable` sets no attribute, `isContentEditable` is undefined,
    and the element cannot take focus — so userEvent would send the key to
    <body> and never reach the guard. The attribute is set directly and the
    event dispatched on the element, which is what a browser does anyway.
  */
  test('stays out of the way in a contenteditable', () => {
    bind()
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.append(editable)

    fireEvent.keyDown(editable, { key: ' ' })
    expect(play).not.toHaveBeenCalled()
  })

  test('still fires for a keypress inside contenteditable="false"', () => {
    bind()
    const notEditable = document.createElement('div')
    notEditable.setAttribute('contenteditable', 'false')
    document.body.append(notEditable)

    fireEvent.keyDown(notEditable, { key: ' ' })
    expect(play).toHaveBeenCalledTimes(1)
  })

  // Cmd-L is "focus the address bar", not "skip forward".
  test('leaves modified presses to the browser', async () => {
    bind()
    await userEvent.keyboard('{Meta>}{ArrowRight}{/Meta}')
    await userEvent.keyboard('{Control>}{ArrowRight}{/Control}')
    await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}')

    expect(forward).not.toHaveBeenCalled()
  })

  test('binds nothing while disabled', async () => {
    bind(false)
    await userEvent.keyboard(' ')
    expect(play).not.toHaveBeenCalled()
  })

  test('detaches its listener on unmount', async () => {
    const { unmount } = bind()
    unmount()

    await userEvent.keyboard(' ')
    expect(play).not.toHaveBeenCalled()
  })
})
