<script>
  import { createEventDispatcher, tick } from 'svelte'
  import { openPdf, removePdf, renamePdf, sharePdf, formatSize } from './pdfStore.js'

  export let pdf

  const dispatch = createEventDispatcher()

  // ── Delete state ─────────────────────────────────────────────────────────
  let confirmDelete = false
  let confirmTimer

  // ── Rename state ─────────────────────────────────────────────────────────
  let renaming = false
  let renameValue = ''
  let renameInput   // bound to the <input> element
  let renameError = ''
  let undoName = ''

  // ── Share state ───────────────────────────────────────────────────────────
  let sharing = false

  // ── Helpers ───────────────────────────────────────────────────────────────
  function handleOpen() {
    openPdf(pdf)
  }

  async function handleShare() {
    if (sharing) return
    sharing = true
    try {
      const result = await sharePdf(pdf)
      dispatch('shared', { id: pdf.id, how: result })
    } catch (err) {
      // User dismissed the share sheet — not an error worth surfacing
      if (err.name !== 'AbortError') {
        dispatch('error', { message: `Could not share: ${err.message}` })
      }
    } finally {
      sharing = false
    }
  }

  // Delete: first click arms, second click confirms
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

  // Rename: enter edit mode
  async function startRename() {
    renameError = ''
    // Strip .pdf extension for a cleaner editing experience
    renameValue = pdf.name.replace(/\.pdf$/i, '')
    renaming = true
    await tick() // wait for the input to render
    renameInput?.select()
  }

  function commitRename() {
    renameError = ''
    try {
      const previousName = pdf.name
      const finalName = renamePdf(pdf.id, renameValue)
      dispatch('renamed', { id: pdf.id, name: finalName })
      // Update the local prop so the card reflects the change immediately
      pdf = { ...pdf, name: finalName }
      undoName = previousName === finalName ? '' : previousName
      renaming = false
    } catch (err) {
      renameError = err.message
      renameInput?.focus()
    }
  }

  function cancelRename() {
    renaming = false
    renameError = ''
  }

  function undoRename() {
    if (!undoName) return
    const restoredName = renamePdf(pdf.id, undoName)
    pdf = { ...pdf, name: restoredName }
    undoName = ''
    dispatch('renameUndone', { id: pdf.id, name: restoredName })
  }

  function onRenameKeydown(e) {
    if (e.key === 'Enter')  commitRename()
    if (e.key === 'Escape') cancelRename()
  }

  $: dateStr = new Date(pdf.addedAt).toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
</script>

<article class="card" class:confirm={confirmDelete} class:is-renaming={renaming}>
  <div class="card-icon">
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 2v6h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 13h6M9 17h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>

  <div class="card-info">
    {#if renaming}
      <!-- Inline rename field -->
      <div class="rename-wrap" class:has-error={renameError}>
        <input
          bind:this={renameInput}
          bind:value={renameValue}
          class="rename-input"
          type="text"
          maxlength="120"
          spellcheck="false"
          aria-label="New file name"
          on:keydown={onRenameKeydown}
          on:blur={commitRename}
        />
        <span class="rename-hint">.pdf</span>
      </div>
      {#if renameError}
        <span class="rename-error">{renameError}</span>
      {/if}
    {:else}
      <button class="card-name card-name-link" on:click={handleOpen} title={`Open ${pdf.name}`}>
        {pdf.name}
      </button>
      <span class="card-meta">{formatSize(pdf.size)} · {dateStr}</span>
    {/if}
  </div>

  <div class="card-actions">
    {#if renaming}
      <!-- Commit rename -->
      <button class="btn-icon btn-confirm" on:click={commitRename} title="Save name">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <!-- Cancel rename -->
      <button class="btn-icon btn-cancel" on:click={cancelRename} title="Cancel rename">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    {:else}
      {#if confirmDelete}
        <!-- Confirmation mode hides the other actions. -->
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
        <!-- Share through the device's native share sheet (for example, WhatsApp) -->
        <button
          class="btn-icon btn-share"
          on:click={handleShare}
          title="Share PDF"
          aria-label={`Share ${pdf.name}`}
          disabled={sharing}
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="6" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="18" cy="19" r="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- Rename -->
        <button class="btn-icon btn-rename" on:click={startRename} title="Rename PDF">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        {#if undoName}
          <button class="btn-icon btn-undo" on:click={undoRename} title="Undo rename">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 7 4 12l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5 12h9a5 5 0 0 1 0 10h-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        {/if}

        <button class="btn-icon btn-delete" on:click={handleDelete} title="Delete PDF">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M9 6V4h6v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      {/if}
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

  .card.is-renaming {
    border-color: rgba(99,102,241,0.5);
    background: rgba(99,102,241,0.07);
    transform: none;
  }

  /* Icon */
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

  /* Info */
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
  .card-name-link {
    display: block;
    width: 100%;
    padding: 0;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .card-name-link:hover,
  .card-name-link:focus-visible {
    color: #a5b4fc;
    text-decoration: underline;
    outline: none;
  }
  .card-meta {
    font-size: 0.75rem;
    color: #64748b;
  }

  /* Rename input */
  .rename-wrap {
    display: flex;
    align-items: center;
    gap: 2px;
    border: 1px solid rgba(99,102,241,0.5);
    border-radius: 7px;
    padding: 0 0.5rem;
    background: rgba(99,102,241,0.08);
    transition: border-color 0.15s;
  }
  .rename-wrap.has-error {
    border-color: rgba(239,68,68,0.6);
    background: rgba(239,68,68,0.06);
  }
  .rename-input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    color: #e2e8f0;
    font-size: 0.9rem;
    font-weight: 500;
    padding: 0.35rem 0;
    font-family: inherit;
  }
  .rename-hint {
    font-size: 0.82rem;
    color: #475569;
    user-select: none;
    flex-shrink: 0;
  }
  .rename-error {
    display: block;
    font-size: 0.72rem;
    color: #f87171;
    margin-top: 2px;
  }

  /* Actions */
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

  .btn-share {
    background: rgba(34,197,94,0.12);
    color: #4ade80;
  }
  .btn-share:hover { background: rgba(34,197,94,0.25); }
  .btn-share:disabled {
    cursor: wait;
    opacity: 0.6;
  }

  .btn-rename {
    background: rgba(234,179,8,0.12);
    color: #fbbf24;
  }
  .btn-rename:hover { background: rgba(234,179,8,0.25); }

  .btn-undo {
    background: rgba(14,165,233,0.12);
    color: #38bdf8;
  }
  .btn-undo:hover { background: rgba(14,165,233,0.25); }

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
