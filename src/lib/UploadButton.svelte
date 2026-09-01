<script>
  import { createEventDispatcher } from 'svelte'
  import { addPdf } from './pdfStore.js'

  const dispatch = createEventDispatcher()

  let isDragging = false
  let fileInput
  let loading = false

  async function handleFiles(files) {
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf')
    if (pdfs.length === 0) {
      dispatch('error', { message: 'Please select PDF files only.' })
      return
    }
    loading = true
    for (const file of pdfs) {
      try {
        const entry = await addPdf(file)
        dispatch('added', { pdf: entry })
      } catch (err) {
        dispatch('error', { message: err.message })
      }
    }
    loading = false
    fileInput.value = ''
  }

  function onFileChange(e) {
    handleFiles(e.target.files)
  }

  function onDrop(e) {
    e.preventDefault()
    isDragging = false
    handleFiles(e.dataTransfer.files)
  }

  function onDragOver(e) {
    e.preventDefault()
    isDragging = true
  }

  function onDragLeave() {
    isDragging = false
  }
</script>

<div
  class="dropzone"
  class:dragging={isDragging}
  class:loading
  on:drop={onDrop}
  on:dragover={onDragOver}
  on:dragleave={onDragLeave}
  on:click={() => !loading && fileInput.click()}
  role="button"
  tabindex="0"
  on:keydown={(e) => e.key === 'Enter' && fileInput.click()}
  aria-label="Add PDF"
>
  <input
    bind:this={fileInput}
    type="file"
    accept="application/pdf"
    multiple
    style="display:none"
    on:change={onFileChange}
  />

  {#if loading}
    <div class="spinner" aria-label="Loading..."></div>
    <p>Processing...</p>
  {:else}
    <div class="dz-icon">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="17 8 12 3 7 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
    <p class="dz-title">Add PDF</p>
    <p class="dz-sub">Click or drag PDF files here</p>
  {/if}
</div>

<style>
  .dropzone {
    border: 2px dashed rgba(99,102,241,0.35);
    border-radius: 16px;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.15s;
    user-select: none;
    background: rgba(99,102,241,0.04);
    color: #94a3b8;
  }

  .dropzone:hover,
  .dropzone.dragging {
    border-color: #6366f1;
    background: rgba(99,102,241,0.1);
    transform: scale(1.01);
  }

  .dropzone.loading {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .dz-icon {
    width: 48px;
    height: 48px;
    background: rgba(99,102,241,0.15);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #818cf8;
    margin-bottom: 0.25rem;
  }
  .dz-icon svg { width: 26px; height: 26px; }

  .dz-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #c7d2fe;
  }
  .dz-sub {
    margin: 0;
    font-size: 0.8rem;
    color: #64748b;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(99,102,241,0.2);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  p { margin: 0; }
</style>

