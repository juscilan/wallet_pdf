import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { webcrypto } from 'node:crypto'

// jsdom's Crypto doesn't expose the SubtleCrypto API; fall back to Node's
// full Web Crypto implementation so AES-GCM encrypt/decrypt works in tests.
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
    writable: true,
  })
}

window.matchMedia =
  window.matchMedia ||
  function matchMedia() {
    return {
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  }

