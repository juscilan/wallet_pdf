<script>
  import { createEventDispatcher } from 'svelte'
  import { openPdf, removePdf, formatSize } from './pdfStore.js'

  export let pdf

  const dispatch = createEventDispatcher()
  let confirmDelete = false
  let confirmTimer

  function handleOpen() {
    openPdf(pdf)
  }

  function handleDelete() {
    if (!confirmDelete) {
      confirmDelete = true
      confirmTimer = setTimeout(() => { confirmDelete = false }, 3000)
      return
    }
    clearTimeout(confirmTimer)
    removePdf(pdf.id)
    dispatch('deleted', { id: pdf.id })
  }

  function cancelDelete() {
    clearTimeout(confirmTimer)
    confirmDelete = false
  }

  $: dateStr = new Date(pdf.addedAt).toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
</script>

<article class="card" class:confirm={confirmDelete}>
  <div class="card-icon">
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 2v6h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 13h6M9 17h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>

  <div class="card-info">
    <p class="card-name" title={pdf.name}>{pdf.name}</p>
    <span class="card-meta">{formatSize(pdf.size)} · {dateStr}</span>
  </div>

  <div class="card-actions">
    <button class="btn-icon btn-view" on:click={handleOpen} title="Open PDF">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
      </svg>
    </button>

    {#if confirmDelete}
      <button class="btn-icon btn-confirm" on:click={handleDelete} title="Confirm delete">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="btn-icon btn-cancel" on:click={cancelDelete} title="Cancel">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    {:else}
      <button class="btn-icon btn-delete" on:click={handleDelete} title="Delete PDF">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M9 6V4h6v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    {/if}
  </div>
</article>

<style>
  .card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    transition: background 0.2s, border-color 0.2s, transform 0.15s;
    animation: slideIn 0.25s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .card:hover {
    background: rgba(255,255,255,0.07);
    border-color: rgba(99,102,241,0.3);
    transform: translateY(-1px);
  }

  .card.confirm {
    border-color: rgba(239,68,68,0.4);
    background: rgba(239,68,68,0.06);
  }

  .card-icon {
    flex-shrink: 0;
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(99,102,241,0.15);
    border-radius: 10px;
    color: #818cf8;
  }
  .card-icon svg { width: 22px; height: 22px; }

  .card-info {
    flex: 1;
    min-width: 0;
  }
  .card-name {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-meta {
    font-size: 0.75rem;
    color: #64748b;
  }

  .card-actions {
    display: flex;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .btn-icon {
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, transform 0.1s;
  }
  .btn-icon svg { width: 16px; height: 16px; }
  .btn-icon:active { transform: scale(0.92); }

  .btn-view {
    background: rgba(99,102,241,0.15);
    color: #818cf8;
  }
  .btn-view:hover { background: rgba(99,102,241,0.3); }

  .btn-delete {
    background: rgba(239,68,68,0.1);
    color: #f87171;
  }
  .btn-delete:hover { background: rgba(239,68,68,0.25); }

  .btn-confirm {
    background: rgba(34,197,94,0.15);
    color: #4ade80;
  }
  .btn-confirm:hover { background: rgba(34,197,94,0.3); }

  .btn-cancel {
    background: rgba(255,255,255,0.05);
    color: #94a3b8;
  }
  .btn-cancel:hover { background: rgba(255,255,255,0.12); }
</style>

