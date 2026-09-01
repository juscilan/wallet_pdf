const KEY_STORAGE_KEY = 'pdf_wallet_key'
const IV_LENGTH = 12
const TAG_LENGTH_BITS = 128

/**
 * Convert hex string to a Uint8Array of bytes.
 * @param {string} hex
 * @returns {Uint8Array}
 */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/**
 * Convert a Uint8Array to a lowercase hex string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToHex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Lazily loads (or creates and persists) the AES-256-GCM key used to encrypt
 * the PDF wallet contents. The key material is stored alongside the data so no
 * password is required; the primary goal is confidentiality of the PDF bytes at
 * rest rather than defense against an attacker with full local access.
 * @returns {Promise<CryptoKey>}
 */
export async function getOrCreateKey() {
  const existing = localStorage.getItem(KEY_STORAGE_KEY)
  if (existing) {
    const raw = hexToBytes(existing)
    return crypto.subtle.importKey(
      'raw',
      raw,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    )
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
  const exported = await crypto.subtle.exportKey('raw', key)
  localStorage.setItem(KEY_STORAGE_KEY, bytesToHex(new Uint8Array(exported)))
  return key
}

/**
 * Encrypts a UTF-8/ASCII string (e.g. a base64 data URL) with AES-256-GCM.
 * @param {string} plaintext
 * @returns {Promise<{iv: string, data: string}>} Hex-encoded IV and ciphertext
 */
export async function encryptString(plaintext) {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: TAG_LENGTH_BITS },
    key,
    encoded,
  )
  return {
    iv: bytesToHex(iv),
    data: bytesToHex(new Uint8Array(ciphertext)),
  }
}

/**
 * Decrypts ciphertext produced by `encryptString`.
 * @param {{iv: string, data: string}} token
 * @returns {Promise<string>} The original plaintext string
 */
export async function decryptString(token) {
  const key = await getOrCreateKey()
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: hexToBytes(token.iv),
      tagLength: TAG_LENGTH_BITS,
    },
    key,
    hexToBytes(token.data),
  )
  return new TextDecoder().decode(decrypted)
}