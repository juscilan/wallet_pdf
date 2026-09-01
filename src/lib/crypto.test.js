import { describe, it, expect, beforeEach } from 'vitest'
import { getOrCreateKey, encryptString, decryptString } from './crypto.js'

const KEY_STORAGE_KEY = 'pdf_wallet_key'

beforeEach(() => {
  localStorage.clear()
})

describe('getOrCreateKey', () => {
  it('generates and persists a new key when none exists', async () => {
    const key = await getOrCreateKey()
    expect(key.type).toBe('secret')
    expect(key.algorithm.name).toBe('AES-GCM')
    expect(localStorage.getItem(KEY_STORAGE_KEY)).toBeTruthy()
  })

  it('reuses the persisted key when one already exists', async () => {
    // establish a key, then capture the persisted material
    await getOrCreateKey()
    const persistedOnce = localStorage.getItem(KEY_STORAGE_KEY)

    // a second call must not rotate the stored key
    localStorage.clear()
    localStorage.setItem(KEY_STORAGE_KEY, persistedOnce)
    await getOrCreateKey()
    expect(localStorage.getItem(KEY_STORAGE_KEY)).toBe(persistedOnce)
    expect(persistedOnce).toHaveLength(64)
  })

  it('produces a 256-bit key', async () => {
    const key = await getOrCreateKey()
    expect(key.algorithm.length).toBe(256)
  })
})

describe('encryptString / decryptString', () => {
  it('round-trips a string', async () => {
    const token = await encryptString('data:application/pdf;base64,JVBERi0x')
    expect(token).toHaveProperty('iv')
    expect(token).toHaveProperty('data')
    expect(token.data).not.toContain('JVBERi0x')
    expect(await decryptString(token)).toBe('data:application/pdf;base64,JVBERi0x')
  })

  it('produces distinct ciphertext for the same plaintext (random IV)', async () => {
    const a = await encryptString('secret')
    const b = await encryptString('secret')
    expect(a.data).not.toEqual(b.data)
    expect(a.iv).not.toEqual(b.iv)
  })
})