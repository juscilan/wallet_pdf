import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  loadPdfs,
  addPdf,
  removePdf,
  renamePdf,
  openPdf,
  sharePdf,
  formatSize,
  usedSpace,
} from './pdfStore.js'
import { encryptString, decryptString } from './crypto.js'

const STORAGE_KEY = 'pdf_wallet_v1'

const PLAINTEXT_DATA_URL = 'data:application/pdf;base64,JVBERi0x'

let validPdf = {
  id: 'pdf_1',
  name: 'doc.pdf',
  size: 1234,
  data: null,
  addedAt: 1000,
}

// Seeds the wallet with entries whose `data` field is encrypted.
async function seedStorage(entries) {
  const encrypted = await Promise.all(
    entries.map(async (e) => ({ ...e, data: await encryptString(e.data) })),
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted))
  return encrypted
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('loadPdfs', () => {
  it('returns [] when nothing is stored', () => {
    expect(loadPdfs()).toEqual([])
  })

  it('returns the parsed array when data exists', async () => {
    await expect(seedStorage([{ ...validPdf, data: PLAINTEXT_DATA_URL }])).resolves.toBeDefined()
    expect(loadPdfs()).toHaveLength(1)
    expect(loadPdfs()[0].data).toHaveProperty('iv')
    expect(loadPdfs()[0].data).toHaveProperty('data')
  })

  it('returns [] when stored JSON is malformed', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json')
    expect(loadPdfs()).toEqual([])
  })
})

describe('addPdf', () => {
  it('rejects a non-PDF file', async () => {
    const file = new File(['x'], 'note.txt', { type: 'text/plain' })
    await expect(addPdf(file)).rejects.toThrow('Only PDF files are supported.')
  })

  it('rejects a file with an empty type', async () => {
    const file = new File(['x'], 'note.bin', { type: '' })
    await expect(addPdf(file)).rejects.toThrow('Only PDF files are supported.')
    // ensure no FileReader was created
  })

  it('saves and resolves an entry for a valid PDF', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'doc.pdf', { type: 'application/pdf' })
    const mockReadAsDataURL = vi
      .spyOn(FileReader.prototype, 'readAsDataURL')
      .mockImplementation(function () {
        this.onload({ target: { result: 'data:application/pdf;base64,AAAA' } })
      })

    const entry = await addPdf(file)

    expect(mockReadAsDataURL).toHaveBeenCalledWith(file)
    expect(entry.name).toBe('doc.pdf')
    expect(entry.size).toBe(3)
    expect(entry.data).toHaveProperty('iv')
    expect(entry.data).toHaveProperty('data')
    expect(entry.id).toMatch(/^pdf_\d+_/)
    expect(typeof entry.addedAt).toBe('number')
    expect(loadPdfs()).toEqual([entry])
    // The stored ciphertext actually decrypts back to the original data URL.
    expect(await decryptString(entry.data)).toBe('data:application/pdf;base64,AAAA')
  })

  it('prevents duplicate files by name + size', async () => {
    await seedStorage([{ ...validPdf, id: 'pdf_1', name: 'doc.pdf', size: 100, data: PLAINTEXT_DATA_URL }])
    const file = new File([new Uint8Array(100)], 'doc.pdf', { type: 'application/pdf' })
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function () {
      this.onload({ target: { result: 'data:application/pdf;base64,AAAA' } })
    })

    await expect(addPdf(file)).rejects.toThrow('"doc.pdf" is already in your wallet.')
    expect(loadPdfs()).toHaveLength(1)
  })

  it('rejects with quota message on QuotaExceededError', async () => {
    const file = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function () {
      this.onload({ target: { result: 'data:application/pdf;base64,AAAA' } })
    })
    const err = new Error('quota exceeded')
    err.name = 'QuotaExceededError'
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw err
    })

    await expect(addPdf(file)).rejects.toThrow('Not enough storage space.')
  })

  it('rejects with quota message when message contains quota', async () => {
    const file = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function () {
      this.onload({ target: { result: 'data:application/pdf;base64,AAAA' } })
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('The quota has been exceeded')
    })

    await expect(addPdf(file)).rejects.toThrow('Not enough storage space.')
  })

  it('rejects with the original error when it is not a quota error', async () => {
    const file = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function () {
      this.onload({ target: { result: 'data:application/pdf;base64,AAAA' } })
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('boom')
    })

    await expect(addPdf(file)).rejects.toThrow('boom')
  })

  it('rejects when FileReader errors', async () => {
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function () {
      this.onerror()
    })

    await expect(addPdf(file)).rejects.toThrow('Failed to read the file.')
  })
})

describe('removePdf', () => {
  it('removes the matching entry', async () => {
    await seedStorage([
      { ...validPdf, data: PLAINTEXT_DATA_URL },
      { ...validPdf, id: 'pdf_2', data: PLAINTEXT_DATA_URL },
    ])
    removePdf('pdf_1')
    expect(loadPdfs()).toHaveLength(1)
    expect(loadPdfs()[0].id).toBe('pdf_2')
  })

  it('is a no-op when the id does not exist', async () => {
    await seedStorage([{ ...validPdf, data: PLAINTEXT_DATA_URL }])
    removePdf('nope')
    expect(loadPdfs()).toHaveLength(1)
  })

  it('handles empty list', () => {
    expect(() => removePdf('nope')).not.toThrow()
  })
})

describe('renamePdf', () => {
  it('trims whitespace from the provided name', async () => {
    await seedStorage([{ ...validPdf, data: PLAINTEXT_DATA_URL }])
    const name = renamePdf('pdf_1', '  renamed  ')
    expect(name).toBe('renamed.pdf')
    expect(loadPdfs()[0].name).toBe('renamed.pdf')
  })

  it('throws when the name is empty after trimming', async () => {
    await seedStorage([{ ...validPdf, data: PLAINTEXT_DATA_URL }])
    expect(() => renamePdf('pdf_1', '   ')).toThrow('File name cannot be empty.')
  })

  it('auto-appends .pdf when missing', async () => {
    await seedStorage([{ ...validPdf, data: PLAINTEXT_DATA_URL }])
    const name = renamePdf('pdf_1', 'newname')
    expect(name).toBe('newname.pdf')
  })

  it('preserves existing .pdf', async () => {
    await seedStorage([{ ...validPdf, data: PLAINTEXT_DATA_URL }])
    const name = renamePdf('pdf_1', 'newname.pdf')
    expect(name).toBe('newname.pdf')
  })

  it('detects .pdf case-insensitively', async () => {
    await seedStorage([{ ...validPdf, data: PLAINTEXT_DATA_URL }])
    const name = renamePdf('pdf_1', 'newname.PDF')
    expect(name).toBe('newname.PDF')
  })

  it('returns the final name and leaves other entries untouched', async () => {
    const other = { ...validPdf, id: 'pdf_2', name: 'keep.pdf', data: PLAINTEXT_DATA_URL }
    await seedStorage([{ ...validPdf, data: PLAINTEXT_DATA_URL }, other])
    const name = renamePdf('pdf_1', 'first')
    expect(name).toBe('first.pdf')
    expect(loadPdfs()[1].name).toBe('keep.pdf')
  })
})

describe('openPdf', () => {
  function mockURL() {
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    return { createObjectURL, revokeObjectURL }
  }

  afterEach(() => {
    delete URL.createObjectURL
    delete URL.revokeObjectURL
  })

  it('opens a blob URL in a new tab and revokes it after the timeout', async () => {
    const token = await encryptString(PLAINTEXT_DATA_URL)
    const pdf = { ...validPdf, data: token }
    vi.useFakeTimers()
    const { createObjectURL, revokeObjectURL } = mockURL()
    const winOpen = vi.spyOn(window, 'open').mockReturnValue({})

    await openPdf(pdf)

    expect(createObjectURL).toHaveBeenCalled()
    expect(winOpen).toHaveBeenCalledWith('blob:mock', '_blank')
    vi.advanceTimersByTime(10000)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('does not revoke when window.open returns null', async () => {
    const token = await encryptString(PLAINTEXT_DATA_URL)
    const pdf = { ...validPdf, data: token }
    vi.useFakeTimers()
    const { revokeObjectURL } = mockURL()
    vi.spyOn(window, 'open').mockReturnValue(null)

    await openPdf(pdf)

    vi.advanceTimersByTime(10000)
    expect(revokeObjectURL).not.toHaveBeenCalled()
  })
})

describe('sharePdf', () => {
  function setNavigator({ canShare, share }) {
    navigator.canShare = canShare
    navigator.share = share
  }

  async function preparePdf() {
    const token = await encryptString(PLAINTEXT_DATA_URL)
    return { ...validPdf, data: token }
  }

  it('returns "shared" when native share is supported', async () => {
    setNavigator({
      canShare: () => true,
      share: vi.fn().mockResolvedValue(undefined),
    })
    const result = await sharePdf(await preparePdf())
    expect(result).toBe('shared')
  })

  it('falls back to a download when canShare is unavailable', async () => {
    setNavigator({ canShare: undefined })
    const createSpy = vi.fn(() => 'blob:mock')
    const revokeSpy = vi.fn()
    URL.createObjectURL = createSpy
    URL.revokeObjectURL = revokeSpy
    const clickSpy = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
    })
    vi.useFakeTimers()

    const result = await sharePdf(await preparePdf())
    expect(result).toBe('downloaded')
    expect(clickSpy).toHaveBeenCalled()

    vi.advanceTimersByTime(5000)
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock')
    expect(createSpy).toHaveBeenCalled()
  })

  it('falls back to a download when canShare returns false', async () => {
    setNavigator({ canShare: () => false })
    vi.useFakeTimers()
    const clickSpy = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue({ href: '', download: '', click: clickSpy })
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    const revokeSpy = vi.fn()
    URL.revokeObjectURL = revokeSpy

    const result = await sharePdf(await preparePdf())
    expect(result).toBe('downloaded')
    expect(clickSpy).toHaveBeenCalled()
    vi.advanceTimersByTime(5000)
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock')
  })
})

describe('formatSize', () => {
  it('returns B for bytes under 1024', () => {
    expect(formatSize(0)).toBe('0 B')
    expect(formatSize(1023)).toBe('1023 B')
  })

  it('returns KB for bytes under 1MB', () => {
    expect(formatSize(1024)).toBe('1.0 KB')
    expect(formatSize(1536)).toBe('1.5 KB')
  })

  it('returns MB for bytes >= 1MB', () => {
    expect(formatSize(1024 * 1024)).toBe('1.00 MB')
    expect(formatSize(1024 * 1024 * 2.5)).toBe('2.50 MB')
  })
})

describe('usedSpace', () => {
  it('returns "0 B" when there are no PDFs', () => {
    expect(usedSpace()).toBe('0 B')
  })

  it('returns the formatted size of the stored value when PDFs exist', async () => {
    await seedStorage([{ ...validPdf, data: PLAINTEXT_DATA_URL }])
    const raw = localStorage.getItem(STORAGE_KEY)
    const expected = formatSize(new Blob([raw]).size)
    expect(usedSpace()).toBe(expected)
  })

  it('handles a missing storage value while loadPdfs still reports PDFs', async () => {
    await seedStorage([{ ...validPdf, data: PLAINTEXT_DATA_URL }])
    const calls = []
    const originalGetItem = Storage.prototype.getItem
    Storage.prototype.getItem = function (key) {
      calls.push(key)
      return calls.length === 2 ? '' : originalGetItem.call(this, key)
    }
    try {
      expect(usedSpace()).toBe('0 B')
    } finally {
      Storage.prototype.getItem = originalGetItem
    }
  })
})
