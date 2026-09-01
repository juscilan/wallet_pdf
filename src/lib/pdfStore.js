const STORAGE_KEY = 'pdf_wallet_v1'

/**
 * Loads all PDFs stored in localStorage.
 * @returns {Array<{id: string, name: string, size: number, data: string, addedAt: number}>}
 */
export function loadPdfs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Persists the full PDF list to localStorage.
 * @param {Array} pdfs
 * @throws {Error} when the localStorage quota is exceeded
 */
function savePdfs(pdfs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pdfs))
}

/**
 * Reads a PDF File, encodes it as Base64 and saves it to the wallet.
 * @param {File} file
 * @returns {Promise<{id: string, name: string, size: number, data: string, addedAt: number}>}
 */
export function addPdf(file) {
  return new Promise((resolve, reject) => {
    if (file.type !== 'application/pdf') {
      reject(new Error('Only PDF files are supported.'))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const entry = {
        id: `pdf_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: file.name,
        size: file.size,
        data: e.target.result, // base64 data URL
        addedAt: Date.now(),
      }

      try {
        const current = loadPdfs()
        // Prevent duplicates by matching name + size
        const duplicate = current.find(p => p.name === entry.name && p.size === entry.size)
        if (duplicate) {
          reject(new Error(`"${file.name}" is already in your wallet.`))
          return
        }
        savePdfs([...current, entry])
        resolve(entry)
      } catch (err) {
        if (err.name === 'QuotaExceededError' || (err.message && err.message.includes('quota'))) {
          reject(new Error('Not enough storage space. Remove some PDFs and try again.'))
        } else {
          reject(err)
        }
      }
    }
    reader.onerror = () => reject(new Error('Failed to read the file.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Removes a PDF entry from the wallet by its ID.
 * @param {string} id
 */
export function removePdf(id) {
  const current = loadPdfs()
  savePdfs(current.filter(p => p.id !== id))
}

/**
 * Opens a stored PDF in a new browser tab using a temporary Blob URL.
 * The URL is revoked after a short delay to free memory.
 * @param {{data: string, name: string}} pdf
 */
export function openPdf(pdf) {
  const base64 = pdf.data.split(',')[1]
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  // Revoke the object URL after a short delay to free memory
  if (win) {
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }
}

/**
 * Formats a byte count into a human-readable string (B / KB / MB).
 * @param {number} bytes
 * @returns {string}
 */
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Estimates the storage space currently used by the wallet in localStorage.
 * @returns {string} Human-readable size string
 */
export function usedSpace() {
  const raw = localStorage.getItem(STORAGE_KEY) || ''
  return formatSize(new Blob([raw]).size)
}

