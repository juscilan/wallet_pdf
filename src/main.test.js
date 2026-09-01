import { describe, it, expect, vi, beforeEach } from 'vitest'

const appFn = vi.fn()

vi.mock('./App.svelte', () => ({
  default: class AppMock {
    constructor(options) {
      appFn(options)
    }
  },
}))

describe('main.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>'
    appFn.mockClear()
  })

  it('mounts the App component into the #app element', async () => {
    const target = document.getElementById('app')
    await import('./main.js')
    expect(appFn).toHaveBeenCalledTimes(1)
    expect(appFn).toHaveBeenCalledWith(expect.objectContaining({ target }))
  })
})