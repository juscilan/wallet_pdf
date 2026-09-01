<script>
  import { onMount } from 'svelte'
  import packageInfo from '../package.json'
  import PdfCard from './lib/PdfCard.svelte'
  import UploadButton from './lib/UploadButton.svelte'
  import { loadPdfs, usedSpace } from './lib/pdfStore.js'

  let pdfs = []
  let toasts = []
  let search = ''
  let spaceUsed = '0 B'
  let installPrompt = null
  let isInstalled = false
  const appVersion = packageInfo.version

  onMount(() => {
    pdfs = loadPdfs()
    spaceUsed = usedSpace()

    isInstalled = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
    const captureInstallPrompt = (event) => {
      event.preventDefault()
      installPrompt = event
    }
    const markInstalled = () => {
      isInstalled = true
      installPrompt = null
      addToast('PDF Wallet installed successfully!', 'success')
    }

    window.addEventListener('beforeinstallprompt', captureInstallPrompt)
    window.addEventListener('appinstalled', markInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
      window.removeEventListener('appinstalled', markInstalled)
    }
  })

  function refreshSpace() {
    spaceUsed = usedSpace()
  }

  function addToast(message, type = 'success') {
    const id = Date.now()
    toasts = [...toasts, { id, message, type }]
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id)
    }, 3500)
  }

  function handleAdded(e) {
    pdfs = [...pdfs, e.detail.pdf]
    refreshSpace()
    addToast(`"${e.detail.pdf.name}" added successfully!`, 'success')
  }

  function handleError(e) {
    addToast(e.detail.message, 'error')
  }

  function handleRenamed(e) {
    const { id, name } = e.detail
    pdfs = pdfs.map(p => p.id === id ? { ...p, name } : p)
    addToast(`Renamed to "${name}".`, 'success')
  }

  function handleRenameUndone(e) {
    pdfs = pdfs.map(p => p.id === e.detail.id ? { ...p, name: e.detail.name } : p)
    addToast(`Restored "${e.detail.name}".`, 'success')
  }

  function handleShared(e) {
    const message = e.detail.how === 'downloaded'
      ? 'PDF downloaded. You can now attach it in WhatsApp.'
      : 'Choose WhatsApp and a contact in the share sheet.'
    addToast(message, 'success')
  }

  function handleDeleted(e) {
    const removed = pdfs.find(p => p.id === e.detail.id)
    pdfs = pdfs.filter(p => p.id !== e.detail.id)
    refreshSpace()
    if (removed) addToast(`"${removed.name}" removido.`, 'info')
  }

  async function installApp() {
    if (!installPrompt) {
      addToast('Use your browser menu to add PDF Wallet to your home screen.', 'info')
      return
    }

    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    installPrompt = null
    if (outcome === 'dismissed') {
      addToast('Installation was cancelled.', 'info')
    }
  }

  $: filtered = pdfs.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )
</script>

<div class="app">
  <!-- Header -->
  <header>
    <div class="header-content">
      <div class="logo">
        <span class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="3" width="20" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M7 8h10M7 12h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="17" cy="15" r="3" fill="#6366f1" stroke="none"/>
            <path d="M16 15l.8.8L18.5 14" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <div>
          <h1>PDF Wallet</h1>
          <p class="subtitle">Your free document wallet</p>
        </div>
      </div>
      <div class="stats">
        <span class="badge">{pdfs.length} PDF{pdfs.length !== 1 ? 's' : ''}</span>
        <span class="badge badge-sm">{spaceUsed} used/5MB</span>
      </div>
    </div>
  </header>

  <main>
    <!-- Upload area -->
    <UploadButton
      on:added={handleAdded}
      on:error={handleError}
    />

    <!-- Search bar -->
    {#if pdfs.length > 0}
      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.5"/>
          <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input
          type="search"
          placeholder="Search PDFs..."
          bind:value={search}
          class="search-input"
        />
      </div>
    {/if}

    <!-- PDF list -->
    <section class="pdf-list">
      {#if pdfs.length === 0}
        <div class="empty">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" stroke-width="1.2"/>
              <path d="M14 2v6h6" stroke="currentColor" stroke-width="1.2"/>
            </svg>
          </div>
          <p>No PDFs in your wallet yet.</p>
          <p class="empty-sub">Add your documents above.</p>
        </div>
      {:else if filtered.length === 0}
        <div class="empty">
          <p>No PDFs found for "<strong>{search}</strong>".</p>
        </div>
      {:else}
        {#each filtered as pdf (pdf.id)}
          <PdfCard
            {pdf}
            on:deleted={handleDeleted}
            on:renamed={handleRenamed}
            on:renameUndone={handleRenameUndone}
            on:shared={handleShared}
            on:error={handleError}
          />
        {/each}
      {/if}
      <!-- {#if !isInstalled}
        <button class="install-button" on:click={installApp} title="Install PDF Wallet">
          Install app
        </button>
      {/if} -->
      <span class="badge badge-version center" aria-label={`App version ${appVersion}`}>App Version: {appVersion}</span>
    </section>
  </main>

  <!-- Toast notifications -->
  <div class="toast-container" aria-live="polite">
    {#each toasts as toast (toast.id)}
      <div class="toast toast-{toast.type}">
        {#if toast.type === 'success'}
          <svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        {:else if toast.type === 'error'}
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        {/if}
        <span>{toast.message}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; }
  :global(body) {
    margin: 0;
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    background: #0f0f1a;
    color: #e2e8f0;
    min-height: 100vh;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Header */
  header {
    padding: 1.5rem 1rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(15,15,26,0.9);
    backdrop-filter: blur(10px);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .header-content {
    max-width: 680px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .logo-icon {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(99,102,241,0.35);
  }
  .logo-icon svg { width: 22px; height: 22px; }
  h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    background: linear-gradient(to right, #c7d2fe, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .subtitle {
    margin: 0;
    font-size: 0.75rem;
    color: #475569;
  }
  .stats {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .badge {
    padding: 0.25rem 0.65rem;
    background: rgba(99,102,241,0.15);
    color: #818cf8;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
    border: 1px solid rgba(99,102,241,0.2);
  }
  .badge-sm { font-size: 0.7rem; color: #64748b; background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.07); }
  .badge-version {
    font-size: 0.7rem;
    color: #a78bfa;
    background: rgba(167,139,250,0.1);
    border-color: rgba(167,139,250,0.2);
    text-align: center;
  }
  .install-button {
    padding: 0.25rem 0.65rem;
    border: 1px solid rgba(99,102,241,0.4);
    border-radius: 999px;
    background: #6366f1;
    color: white;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }
  .install-button:hover,
  .install-button:focus-visible {
    background: #4f46e5;
    outline: 2px solid #a5b4fc;
    outline-offset: 2px;
  }

  /* Main */
  main {
    max-width: 680px;
    margin: 0 auto;
    padding: 1.5rem 1rem 6rem;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* Search */
  .search-wrap {
    position: relative;
  }
  .search-icon {
    position: absolute;
    left: 0.9rem;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #475569;
    pointer-events: none;
  }
  .search-input {
    width: 100%;
    padding: 0.65rem 1rem 0.65rem 2.4rem;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    color: #e2e8f0;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s;
  }
  .search-input::placeholder { color: #475569; }
  .search-input:focus { border-color: rgba(99,102,241,0.5); }

  /* PDF list */
  .pdf-list {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  /* Empty */
  .empty {
    text-align: center;
    padding: 3rem 1rem;
    color: #475569;
  }
  .empty-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 1rem;
    background: rgba(255,255,255,0.03);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #334155;
  }
  .empty-icon svg { width: 32px; height: 32px; }
  .empty p { margin: 0 0 0.25rem; }
  .empty-sub { font-size: 0.82rem; color: #334155; }

  /* Toasts */
  .toast-container {
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 100;
    pointer-events: none;
    width: min(92vw, 420px);
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 500;
    animation: toastIn 0.5s ease;
    backdrop-filter: blur(8px);
  }
  .toast svg { width: 18px; height: 18px; flex-shrink: 0; }
  .toast-success { background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
  .toast-error   { background: rgba(239,68,68,0.15);  border: 1px solid rgba(239,68,68,0.3);  color: #f87171; }
  .toast-info    { background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #818cf8; }
  @keyframes toastIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
