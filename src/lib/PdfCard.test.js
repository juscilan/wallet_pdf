import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/svelte'
import PdfCard from './PdfCard.svelte'

vi.mock('./pdfStore.js', async () => {
  const actual = await vi.importActual('./pdfStore.js')
  return {
    ...actual,
    openPdf: vi.fn(),
    removePdf: vi.fn(),
    renamePdf: vi.fn(),
    sharePdf: vi.fn(),
    formatSize: actual.formatSize,
  }
})

import { openPdf, removePdf, renamePdf, sharePdf } from './pdfStore.js'

const pdf = {
  id: 'pdf_1',
  name: 'report.pdf',
  size: 2048,
  data: 'data:application/pdf;base64,AAAA',
  addedAt: new Date('2024-01-15T00:00:00Z').getTime(),
}

beforeEach(() => {
  vi.useRealTimers()
  openPdf.mockReset()
  removePdf.mockReset()
  renamePdf.mockReset()
  sharePdf.mockReset()
})

function setup(overrides = {}) {
  return render(PdfCard, { props: { pdf: { ...pdf, ...overrides } } })
}

describe('PdfCard', () => {
  it('renders the card with name, formatted size and date', () => {
    const expectedDate = new Date(pdf.addedAt).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    const { getByRole, getByText } = setup()
    expect(getByRole('button', { name: 'Open report.pdf' })).toBeInTheDocument()
    expect(getByText('report.pdf')).toBeInTheDocument()
    expect(getByText(/2\.0 KB/)).toBeInTheDocument()
    expect(getByText(new RegExp(expectedDate.replace(/ /g, '\\s')))).toBeInTheDocument()
  })

  it('opens the PDF when the icon or name is clicked', async () => {
    const { getAllByRole } = setup()
    const openButtons = getAllByRole('button', { name: 'Open report.pdf' })
    await fireEvent.click(openButtons[0])
    await waitFor(() => expect(openPdf).toHaveBeenCalledWith(pdf))
  })

  it('shares and dispatches shared when sharePdf succeeds', async () => {
    sharePdf.mockResolvedValue('shared')
    const component = setup()
    const shared = vi.fn()
    component.component.$on('shared', shared)
    const btn = component.getByRole('button', { name: 'Share report.pdf' })
    await fireEvent.click(btn)
    await waitFor(() =>
      expect(shared).toHaveBeenCalledWith(
        expect.objectContaining({ detail: { id: 'pdf_1', how: 'shared' } })
      )
    )
  })

  it('dispatches shared when sharePdf falls back to download', async () => {
    sharePdf.mockResolvedValue('downloaded')
    const component = setup()
    const shared = vi.fn()
    component.component.$on('shared', shared)
    const btn = component.getByRole('button', { name: 'Share report.pdf' })
    await fireEvent.click(btn)
    await waitFor(() =>
      expect(shared).toHaveBeenCalledWith(
        expect.objectContaining({ detail: { id: 'pdf_1', how: 'downloaded' } })
      )
    )
  })

  it('dispatches error when sharePdf rejects with a non-AbortError', async () => {
    sharePdf.mockRejectedValue(new Error('denied'))
    const component = setup()
    const error = vi.fn()
    component.component.$on('error', error)
    const btn = component.getByRole('button', { name: 'Share report.pdf' })
    await fireEvent.click(btn)
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({ detail: { message: 'Could not share: denied' } })
      )
    )
  })

  it('does not dispatch error when user aborts the share sheet', async () => {
    const abort = new Error('aborted')
    abort.name = 'AbortError'
    sharePdf.mockRejectedValue(abort)
    const component = setup()
    const error = vi.fn()
    component.component.$on('error', error)
    const btn = component.getByRole('button', { name: 'Share report.pdf' })
    await fireEvent.click(btn)
    // allow the promise to settle
    await new Promise((r) => setTimeout(r, 0))
    expect(error).not.toHaveBeenCalled()
  })

  it('ignores a share attempt while a share is already in progress', async () => {
    sharePdf.mockReturnValue(new Promise(() => {}))
    const component = setup()
    const shared = vi.fn()
    component.component.$on('shared', shared)
    const btn = component.getByRole('button', { name: 'Share report.pdf' })
    await fireEvent.click(btn)
    expect(btn.disabled).toBe(true)

    // Invoke the internal handler again while sharing is still in progress.
    const handleShare = component.component.$$.ctx.find(
      (v) => typeof v === 'function' && v.name === 'handleShare'
    )
    handleShare()
    await new Promise((r) => setTimeout(r, 0))
    expect(shared).not.toHaveBeenCalled()
    expect(sharePdf).toHaveBeenCalledTimes(1)
  })

  it('undoRename does nothing when there is nothing to undo', async () => {
    const component = setup()
    const undoRename = component.component.$$.ctx.find(
      (v) => typeof v === 'function' && v.name === 'undoRename'
    )
    expect(undoRename).toBeTypeOf('function')
    undoRename()
    expect(component.queryByTitle('Undo rename')).not.toBeInTheDocument()
  })

  it('deletes only after the second click confirmation', async () => {
    removePdf.mockImplementation(() => {})
    const component = setup()
    const deleted = vi.fn()
    component.component.$on('deleted', deleted)

    const deleteBtn = component.getByTitle('Delete PDF')
    await fireEvent.click(deleteBtn)
    // now confirmation mode shows confirm button
    expect(component.getByTitle('Confirm delete')).toBeInTheDocument()
    expect(deleted).not.toHaveBeenCalled()

    await fireEvent.click(component.getByTitle('Confirm delete'))
    await waitFor(() => expect(removePdf).toHaveBeenCalledWith('pdf_1'))
    expect(deleted).toHaveBeenCalledWith(expect.objectContaining({ detail: { id: 'pdf_1' } }))
  })

  it('cancels a pending delete', async () => {
    const component = setup()
    await fireEvent.click(component.getByTitle('Delete PDF'))
    expect(component.getByTitle('Confirm delete')).toBeInTheDocument()
    await fireEvent.click(component.getByTitle('Cancel'))
    expect(component.queryByTitle('Confirm delete')).not.toBeInTheDocument()
    expect(component.getByTitle('Delete PDF')).toBeInTheDocument()
  })

  it('auto-resets delete confirmation after 3 seconds', async () => {
    vi.useFakeTimers()
    const component = setup()
    await fireEvent.click(component.getByTitle('Delete PDF'))
    expect(component.getByTitle('Confirm delete')).toBeInTheDocument()
    await vi.advanceTimersByTimeAsync(3000)
    expect(component.queryByTitle('Confirm delete')).not.toBeInTheDocument()
  })

  it('enters rename mode and strips the .pdf extension', async () => {
    const component = setup()
    await fireEvent.click(component.getByTitle('Rename PDF'))
    const input = component.getByLabelText('New file name')
    expect(input.value).toBe('report')
    expect(component.getByTitle('Save name')).toBeInTheDocument()
    expect(component.getByTitle('Cancel rename')).toBeInTheDocument()
  })

  it('commits the rename via the save button', async () => {
    renamePdf.mockReturnValue('renamed.pdf')
    const component = setup()
    const renamed = vi.fn()
    component.component.$on('renamed', renamed)
    await fireEvent.click(component.getByTitle('Rename PDF'))
    const input = component.getByLabelText('New file name')
    await fireEvent.input(input, { target: { value: 'renamed' } })
    await fireEvent.click(component.getByTitle('Save name'))
    await waitFor(() =>
      expect(renamed).toHaveBeenCalledWith(
        expect.objectContaining({ detail: { id: 'pdf_1', name: 'renamed.pdf' } })
      )
    )
    expect(component.getByText('renamed.pdf')).toBeInTheDocument()
  })

  it('commits the rename on Enter and cancels on Escape', async () => {
    renamePdf.mockReturnValue('enter.pdf')
    const component = setup()
    const renamed = vi.fn()
    component.component.$on('renamed', renamed)
    await fireEvent.click(component.getByTitle('Rename PDF'))
    const input = component.getByLabelText('New file name')
    await fireEvent.input(input, { target: { value: 'enter' } })
    await fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(renamed).toHaveBeenCalled())

    // re-open rename and cancel with Escape
    const renamed2 = vi.fn()
    component.component.$on('renamed', renamed2)
    await fireEvent.click(component.getByTitle('Rename PDF'))
    await fireEvent.keyDown(component.getByLabelText('New file name'), { key: 'Escape' })
    expect(component.queryByLabelText('New file name')).not.toBeInTheDocument()
    expect(component.getByText('enter.pdf')).toBeInTheDocument()
  })

  it('shows an error and stays in rename mode when name is empty', async () => {
    renamePdf.mockImplementation(() => {
      throw new Error('File name cannot be empty.')
    })
    const component = setup()
    await fireEvent.click(component.getByTitle('Rename PDF'))
    const input = component.getByLabelText('New file name')
    await fireEvent.input(input, { target: { value: '   ' } })
    await fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() =>
      expect(component.getByText('File name cannot be empty.')).toBeInTheDocument()
    )
    expect(component.getByLabelText('New file name')).toBeInTheDocument()
  })

  it('sets undoName and shows the undo button when renamed', async () => {
    renamePdf.mockReturnValue('renamed.pdf')
    const component = setup()
    await fireEvent.click(component.getByTitle('Rename PDF'))
    await fireEvent.input(component.getByLabelText('New file name'), {
      target: { value: 'renamed' },
    })
    await fireEvent.click(component.getByTitle('Save name'))
    await waitFor(() => expect(component.getByTitle('Undo rename')).toBeInTheDocument())
  })

  it('does not show undo button when the name did not change', async () => {
    renamePdf.mockReturnValue('report.pdf')
    const component = setup()
    await fireEvent.click(component.getByTitle('Rename PDF'))
    await fireEvent.input(component.getByLabelText('New file name'), {
      target: { value: 'report' },
    })
    await fireEvent.click(component.getByTitle('Save name'))
    await waitFor(() => expect(component.queryByTitle('Undo rename')).not.toBeInTheDocument())
  })

  it('undoes a rename and dispatches renameUndone', async () => {
    renamePdf.mockImplementation((id, name) => (name === 'renamed' ? 'renamed.pdf' : 'report.pdf'))
    const component = setup()
    const renameUndone = vi.fn()
    component.component.$on('renameUndone', renameUndone)

    await fireEvent.click(component.getByTitle('Rename PDF'))
    await fireEvent.input(component.getByLabelText('New file name'), {
      target: { value: 'renamed' },
    })
    await fireEvent.click(component.getByTitle('Save name'))
    await waitFor(() => expect(component.getByTitle('Undo rename')).toBeInTheDocument())

    await fireEvent.click(component.getByTitle('Undo rename'))
    await waitFor(() =>
      expect(renameUndone).toHaveBeenCalledWith(
        expect.objectContaining({ detail: { id: 'pdf_1', name: 'report.pdf' } })
      )
    )
    expect(component.queryByTitle('Undo rename')).not.toBeInTheDocument()
    expect(component.getByText('report.pdf')).toBeInTheDocument()
  })
})
