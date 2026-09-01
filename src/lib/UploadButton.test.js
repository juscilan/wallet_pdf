import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/svelte'
import UploadButton from './UploadButton.svelte'

vi.mock('./pdfStore.js', async () => {
  const actual = await vi.importActual('./pdfStore.js')
  return { ...actual, addPdf: vi.fn() }
})

import { addPdf } from './pdfStore.js'

const pdfFile = (name = 'doc.pdf') =>
  new File([new Uint8Array([1, 2, 3])], name, { type: 'application/pdf' })
const nonPdfFile = new File(['x'], 'note.txt', { type: 'text/plain' })

beforeEach(() => {
  addPdf.mockReset()
})

describe('UploadButton', () => {
  it('renders the dropzone with upload copy', () => {
    const { getByText, getByRole } = render(UploadButton)
    expect(getByText('Add PDF')).toBeInTheDocument()
    expect(getByText('Click or drag PDF files here')).toBeInTheDocument()
    expect(getByRole('button')).toHaveAttribute('aria-label', 'Add PDF')
  })

  it('opens the file dialog on click', async () => {
    const { container } = render(UploadButton)
    const input = container.querySelector('input[type="file"]')
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    const dropzone = container.querySelector('.dropzone')
    await fireEvent.click(dropzone)
    expect(clickSpy).toHaveBeenCalled()
  })

  it('opens the file dialog on Enter key', async () => {
    const { container } = render(UploadButton)
    const input = container.querySelector('input[type="file"]')
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    const dropzone = container.querySelector('.dropzone')
    await fireEvent.keyDown(dropzone, { key: 'Enter' })
    expect(clickSpy).toHaveBeenCalled()
  })

  it('does not open the file dialog on non-Enter keys', async () => {
    const { container } = render(UploadButton)
    const input = container.querySelector('input[type="file"]')
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    const dropzone = container.querySelector('.dropzone')
    await fireEvent.keyDown(dropzone, { key: 'a' })
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('dispatches added events for valid PDF files', async () => {
    addPdf.mockImplementation((file) =>
      Promise.resolve({ id: 'pdf_x', name: file.name, size: file.size, data: 'x', addedAt: 1 })
    )
    const component = render(UploadButton)
    const added = vi.fn()
    component.component.$on('added', added)

    await fireEvent.change(component.container.querySelector('input[type="file"]'), {
      target: { files: [pdfFile('a.pdf'), pdfFile('b.pdf')] },
    })

    await waitFor(() => expect(added).toHaveBeenCalledTimes(2))
    expect(component.getByText('Add PDF')).toBeInTheDocument()
  })

  it('dispatches an error when only non-PDF files are selected', async () => {
    const component = render(UploadButton)
    const error = vi.fn()
    component.component.$on('error', error)

    await fireEvent.change(component.container.querySelector('input[type="file"]'), {
      target: { files: [nonPdfFile] },
    })

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({ detail: { message: 'Please select PDF files only.' } })
      )
    )
    expect(component.getByText('Add PDF')).toBeInTheDocument()
  })

  it('dispatches error with the message when addPdf throws', async () => {
    addPdf.mockImplementation(() => Promise.reject(new Error('boom')))
    const component = render(UploadButton)
    const error = vi.fn()
    component.component.$on('error', error)

    await fireEvent.change(component.container.querySelector('input[type="file"]'), {
      target: { files: [pdfFile()] },
    })

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(expect.objectContaining({ detail: { message: 'boom' } }))
    )
  })

  it('clears the file input after processing', async () => {
    addPdf.mockResolvedValue({ id: 'pdf_x', name: 'a.pdf', size: 3, data: 'x', addedAt: 1 })
    const component = render(UploadButton)
    const input = component.container.querySelector('input[type="file"]')
    const setSpy = vi.spyOn(input, 'value', 'set')

    await fireEvent.change(input, {
      target: { files: [pdfFile()] },
    })

    await waitFor(() => expect(setSpy).toHaveBeenCalledWith(''))
  })

  it('processes files dropped onto the dropzone', async () => {
    addPdf.mockResolvedValue({ id: 'pdf_x', name: 'drop.pdf', size: 3, data: 'x', addedAt: 1 })
    const component = render(UploadButton)
    const added = vi.fn()
    component.component.$on('added', added)

    const dropzone = component.container.querySelector('.dropzone')
    await fireEvent.drop(dropzone, {
      dataTransfer: { files: [pdfFile('drop.pdf')] },
    })

    await waitFor(() => expect(added).toHaveBeenCalledTimes(1))
    expect(dropzone.classList.contains('dragging')).toBe(false)
  })

  it('toggles dragging state on dragover and dragleave', async () => {
    const { container } = render(UploadButton)
    const dropzone = container.querySelector('.dropzone')

    await fireEvent.dragOver(dropzone)
    expect(dropzone.classList.contains('dragging')).toBe(true)

    await fireEvent.dragLeave(dropzone)
    expect(dropzone.classList.contains('dragging')).toBe(false)
  })

  it('ignores click on the dropzone while loading', async () => {
    addPdf.mockImplementation(
      () =>
        new Promise(() => {}) // never resolves -> stays in loading while test runs
    )
    const component = render(UploadButton)
    const input = component.container.querySelector('input[type="file"]')
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})

    const dropzone = component.container.querySelector('.dropzone')
    await fireEvent.change(input, { target: { files: [pdfFile()] } })
    await waitFor(() => expect(component.getByText('Processing...')).toBeInTheDocument())

    await fireEvent.click(dropzone)
    expect(clickSpy).not.toHaveBeenCalled()
  })
})
