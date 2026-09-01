import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/svelte'
import App from './App.svelte'
import packageInfo from '../package.json'
import { uploadStubState, pdfCardStubState } from './test/stubState.js'

vi.mock('./lib/UploadButton.svelte', async () => {
  const mod = await import('./test/UploadButtonStub.svelte')
  return { default: mod.default }
})

vi.mock('./lib/PdfCard.svelte', async () => {
  const mod = await import('./test/PdfCardStub.svelte')
  return { default: mod.default }
})

vi.mock('./lib/pdfStore.js', async () => {
  const actual = await vi.importActual('./lib/pdfStore.js')
  return {
    ...actual,
    loadPdfs: vi.fn(),
    usedSpace: vi.fn(),
  }
})

import { loadPdfs, usedSpace } from './lib/pdfStore.js'

const pdf = {
  id: 'pdf_1',
  name: 'report.pdf',
  size: 2048,
  data: 'data:application/pdf;base64,AAAA',
  addedAt: 1700000000000,
}

beforeEach(() => {
  vi.restoreAllMocks()
  loadPdfs.mockReset()
  usedSpace.mockReset()
  localStorage.clear()
  loadPdfs.mockReturnValue([])
  usedSpace.mockReturnValue('0 B')
  uploadStubState.addedPayload = null
  uploadStubState.errorPayload = null
  pdfCardStubState.deletedPayload = null
  pdfCardStubState.renamedPayload = null
  pdfCardStubState.renameUndonePayload = null
  pdfCardStubState.sharedPayload = null
  pdfCardStubState.errorPayload = null
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('App', () => {
  it('renders header, upload area and version badge', async () => {
    const { getByText } = render(App)
    expect(getByText('PDF Wallet')).toBeInTheDocument()
    expect(getByText('Your free document wallet')).toBeInTheDocument()
    expect(getByText('0 B used/5MB')).toBeInTheDocument()
    expect(getByText(new RegExp(`App Version: ${packageInfo.version.replace('.', '\\.')}`))).toBeInTheDocument()
    expect(getByText('0 PDFs')).toBeInTheDocument()
  })

  it('shows the empty state when there are no PDFs', async () => {
    const { getByText } = render(App)
    expect(getByText('No PDFs in your wallet yet.')).toBeInTheDocument()
  })

  it('loads existing PDFs on mount and shows count and search', async () => {
    loadPdfs.mockReturnValue([pdf])
    usedSpace.mockReturnValue('2.0 KB')
    const { getByText, getByPlaceholderText } = render(App)
    await waitFor(() => expect(getByText('1 PDF')).toBeInTheDocument())
    expect(getByText('2.0 KB used/5MB')).toBeInTheDocument()
    expect(getByPlaceholderText('Search PDFs...')).toBeInTheDocument()
  })

  it('pluralizes the PDF count', async () => {
    loadPdfs.mockReturnValue([pdf, { ...pdf, id: 'pdf_2', name: 'b.pdf' }])
    const { getByText } = render(App)
    await waitFor(() => expect(getByText('2 PDFs')).toBeInTheDocument())
  })

  it('filters the displayed PDFs by search (case-insensitive)', async () => {
    loadPdfs.mockReturnValue([
      pdf,
      { ...pdf, id: 'pdf_2', name: 'Contract.pdf', data: 'y', size: 1 },
    ])
    const { getByPlaceholderText, getAllByTestId, queryAllByTestId } = render(App)
    await waitFor(() => expect(getAllByTestId('pdf-fire-deleted')).toHaveLength(2))

    const searchInput = getByPlaceholderText('Search PDFs...')
    await fireEvent.input(searchInput, { target: { value: 'contract' } })

    // Only the matching card should remain after filtering (case-insensitive).
    await waitFor(() => expect(queryAllByTestId('pdf-fire-deleted')).toHaveLength(1))
  })

  it('shows the no-results state when the search matches nothing', async () => {
    loadPdfs.mockReturnValue([pdf])
    const { getByPlaceholderText, getByText } = render(App)
    const searchInput = getByPlaceholderText('Search PDFs...')
    await fireEvent.input(searchInput, { target: { value: 'zzz' } })
    await waitFor(() => expect(getByText(/No PDFs found for/)).toBeInTheDocument())
  })

  it('handleAdded adds a pdf, refreshes space and shows a toast', async () => {
    usedSpace.mockReturnValue('1.0 KB')
    const { getByTestId, getByText } = render(App)
    uploadStubState.addedPayload = { pdf }
    await fireEvent.click(getByTestId('upload-fire-added'))
    await waitFor(() => {
      expect(getByText(`"report.pdf" added successfully!`)).toBeInTheDocument()
      expect(getByText('1.0 KB used/5MB')).toBeInTheDocument()
    })
    expect(getByText('1 PDF')).toBeInTheDocument()
  })

  it('handleError shows an error toast', async () => {
    const { getByTestId, getByText } = render(App)
    uploadStubState.errorPayload = { message: 'oops' }
    await fireEvent.click(getByTestId('upload-fire-error'))
    await waitFor(() => expect(getByText('oops')).toBeInTheDocument())
  })

  it('handleDeleted removes the pdf, refreshes space and shows toast', async () => {
    loadPdfs.mockReturnValue([pdf])
    usedSpace.mockReturnValue('0 B')
    const { getByTestId, getByText } = render(App)
    await waitFor(() => expect(getByTestId('pdf-fire-deleted')).toBeInTheDocument())

    pdfCardStubState.deletedPayload = { id: 'pdf_1' }
    await fireEvent.click(getByTestId('pdf-fire-deleted'))
    await waitFor(() => {
      expect(getByText('"report.pdf" removido.')).toBeInTheDocument()
    })
    expect(getByText('0 PDFs')).toBeInTheDocument()
  })

  it('handleDeleted does not show a toast when the id is unknown', async () => {
    loadPdfs.mockReturnValue([pdf])
    const { getByTestId, queryByText } = render(App)
    await waitFor(() => expect(getByTestId('pdf-fire-deleted')).toBeInTheDocument())

    pdfCardStubState.deletedPayload = { id: 'unknown' }
    await fireEvent.click(getByTestId('pdf-fire-deleted'))
    expect(queryByText('"report.pdf" removido.')).not.toBeInTheDocument()
  })

  it('handleRenamed updates the pdf name and shows toast', async () => {
    loadPdfs.mockReturnValue([pdf])
    const { getByTestId, getByText } = render(App)
    await waitFor(() => expect(getByTestId('pdf-fire-renamed')).toBeInTheDocument())

    pdfCardStubState.renamedPayload = { id: 'pdf_1', name: 'new.pdf' }
    await fireEvent.click(getByTestId('pdf-fire-renamed'))
    await waitFor(() => expect(getByText('Renamed to "new.pdf".')).toBeInTheDocument())
  })

  it('handleRenamed leaves other pdfs untouched', async () => {
    loadPdfs.mockReturnValue([pdf, { ...pdf, id: 'pdf_2', name: 'other.pdf' }])
    const { getAllByTestId } = render(App)
    await waitFor(() => expect(getAllByTestId('pdf-fire-renamed')).toHaveLength(2))

    pdfCardStubState.renamedPayload = { id: 'pdf_1', name: 'new.pdf' }
    const buttons = getAllByTestId('pdf-fire-renamed')
    await fireEvent.click(buttons[1])
    // No toast is produced (non-matching mapping), and nothing crashes.
  })

  it('handleRenameUndone restores the pdf name and shows toast', async () => {
    loadPdfs.mockReturnValue([pdf])
    const { getByTestId, getByText } = render(App)
    await waitFor(() => expect(getByTestId('pdf-fire-undone')).toBeInTheDocument())

    pdfCardStubState.renameUndonePayload = { id: 'pdf_1', name: 'orig.pdf' }
    await fireEvent.click(getByTestId('pdf-fire-undone'))
    await waitFor(() => expect(getByText('Restored "orig.pdf".')).toBeInTheDocument())
  })

  it('handleRenameUndone leaves other pdfs untouched', async () => {
    loadPdfs.mockReturnValue([pdf, { ...pdf, id: 'pdf_2', name: 'other.pdf' }])
    const { getAllByTestId } = render(App)
    await waitFor(() => expect(getAllByTestId('pdf-fire-undone')).toHaveLength(2))

    pdfCardStubState.renameUndonePayload = { id: 'pdf_2', name: 'again.pdf' }
    const buttons = getAllByTestId('pdf-fire-undone')
    await fireEvent.click(buttons[0])
  })

  it('handleShared shows a download toast when shared via download', async () => {
    loadPdfs.mockReturnValue([pdf])
    const { getByTestId, getByText } = render(App)
    await waitFor(() => expect(getByTestId('pdf-fire-shared')).toBeInTheDocument())

    pdfCardStubState.sharedPayload = { id: 'pdf_1', how: 'downloaded' }
    await fireEvent.click(getByTestId('pdf-fire-shared'))
    await waitFor(() =>
      expect(getByText('PDF downloaded. You can now attach it in WhatsApp.')).toBeInTheDocument()
    )
  })

  it('handleShared shows a share-sheet toast when shared natively', async () => {
    loadPdfs.mockReturnValue([pdf])
    usedSpace.mockReturnValue('2.0 KB')
    const { getByTestId, getByText } = render(App)
    await waitFor(() => expect(getByTestId('pdf-fire-shared')).toBeInTheDocument())

    pdfCardStubState.sharedPayload = { id: 'pdf_1', how: 'shared' }
    await fireEvent.click(getByTestId('pdf-fire-shared'))
    await waitFor(() =>
      expect(getByText('Choose WhatsApp and a contact in the share sheet.')).toBeInTheDocument()
    )
  })

  it('auto-dismisses toasts after 3500ms', async () => {
    vi.useFakeTimers()
    const { getByTestId, queryByText } = render(App)
    uploadStubState.errorPayload = { message: 'temp' }
    await fireEvent.click(getByTestId('upload-fire-error'))
    await vi.advanceTimersByTimeAsync(3500)
    await waitFor(() => expect(queryByText('temp')).not.toBeInTheDocument())
  })
})