<div align="center">

<img src="public/icons/icon-512.png" width="120" alt="PDF Wallet logo" />

# 📄 PDF Wallet

**A lightweight Progressive Web App to store, manage and view your PDF documents — entirely in the browser.**

[![Svelte](https://img.shields.io/badge/Svelte-4.x-FF3E00?style=flat-square&logo=svelte)](https://svelte.dev)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| ➕ **Add PDFs** | Click the upload zone or drag-and-drop one or multiple PDF files at once |
| ✏️ **Rename PDFs** | Edit a filename inline; an Undo button on the card restores the previous name |
| 📤 **Share PDFs** | Opens the device share sheet for targets such as WhatsApp; downloads the file when file sharing is unavailable |
| 🗑️ **Delete PDFs** | Two-step delete confirmation to prevent accidental removal |
| 🔗 **Open PDFs** | Click the filename to open the document in a new tab using a temporary Blob URL |
| 🔍 **Search** | Real-time filter by file name |
| 📊 **Storage stats** | Shows total PDF count and localStorage space used |
| 🔔 **Toast notifications** | Success, error and info feedback for every action |
| ⚠️ **Quota guard** | Friendly error if the localStorage 5 MB limit is exceeded |
| 📱 **PWA** | Installable on desktop and mobile (Chrome, Edge, Safari) |
| 🌙 **Dark UI** | Polished dark-theme interface, mobile-friendly |

---

## 🏗️ Tech Stack

- **[Svelte 4](https://svelte.dev)** — reactive UI framework with zero virtual DOM overhead
- **[Vite 5](https://vitejs.dev)** — lightning-fast build tool and dev server
- **[vite-plugin-pwa](https://vite-pwa-org.netlify.app)** — automatic Service Worker (Workbox) + Web App Manifest generation
- **[localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)** — browser-native persistence (PDFs stored as Base64 data URLs)

No backend. No database. No external dependencies at runtime.

---

## 📂 Project Structure

```
wallet_pdf/
├── public/
│   ├── favicon.svg              # SVG favicon
│   └── icons/
│       ├── icon-192.png         # PWA icon (192×192)
│       └── icon-512.png         # PWA icon (512×512)
├── src/
│   ├── lib/
│   │   ├── pdfStore.js          # localStorage CRUD + Base64 encoding
│   │   ├── PdfCard.svelte       # Individual PDF card actions
│   │   └── UploadButton.svelte  # Drag-and-drop upload zone
│   ├── App.svelte               # Root component: layout, search, toasts
│   └── main.js                  # App entry point
├── CLAUDE.md                     # Project conventions and validation guidance
├── SKILL.md                      # PDF Wallet development workflow
├── TASK.md                       # Current task state
├── index.html
├── vite.config.js               # Vite + PWA plugin config
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 18
- npm ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/wallet_pdf.git
cd wallet_pdf

# Install dependencies
npm install
```

### Development

```bash
npm run dev
```

Opens the app at **http://localhost:5173** with HMR (Hot Module Replacement).

### Production build

```bash
npm run build
```

Output is in the `dist/` folder. Includes the Service Worker and manifest.

### Preview production build locally

```bash
npm run preview
```

---

## 📱 Installing as a PWA

1. Open the app in **Chrome** or **Edge**
2. Look for the **install icon** (➕) in the browser address bar
3. Click **"Install"**
4. The app opens as a standalone window — no browser UI

On **Safari/iOS**: tap the Share button → *Add to Home Screen*.

---

## 🗄️ How Storage Works

PDFs are serialized to Base64 data URLs using the [`FileReader` API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader) and stored in `localStorage` under the key `pdf_wallet_v1`.

```
localStorage["pdf_wallet_v1"] = JSON.stringify([
  {
    id:       "pdf_1725000000000_abc123",
    name:     "contract.pdf",
    size:     102400,         // bytes (original file size)
    data:     "data:application/pdf;base64,...",
    addedAt:  1725000000000   // Unix timestamp
  },
  ...
])
```

### Storage limits

> **⚠️ Important:** `localStorage` has a per-origin limit of approximately **5 MB** (varies by browser). Because Base64 encoding inflates file size by ~33%, a 3.5 MB PDF will already approach the limit.

The app handles the `QuotaExceededError` gracefully and shows a user-friendly toast message.

**Future improvement:** migrate to [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (no practical size limit) for larger PDF collections.

---

## 🧩 Component Overview

### `pdfStore.js`

Pure JavaScript module exposing:

| Function | Signature | Description |
|---|---|---|
| `loadPdfs()` | `→ Array` | Reads and parses the stored PDF list |
| `addPdf(file)` | `File → Promise<entry>` | Reads, validates, deduplicates and saves a PDF |
| `removePdf(id)` | `string → void` | Removes a PDF entry by ID |
| `renamePdf(id, name)` | `string, string → string` | Validates and saves a filename, adding `.pdf` when needed |
| `openPdf(pdf)` | `entry → void` | Creates a Blob URL and opens the PDF in a new tab |
| `sharePdf(pdf)` | `entry → Promise<'shared' \| 'downloaded'>` | Shares the PDF through the Web Share API or downloads it as a fallback |
| `formatSize(bytes)` | `number → string` | Formats bytes as `B / KB / MB` |
| `usedSpace()` | `→ string` | Returns the current wallet storage footprint |

### `PdfCard.svelte`

Displays one PDF entry with:
- File icon, name (truncated with ellipsis) and metadata (size + date added)
- Clickable filename → calls `openPdf()`
- **Share** button → uses the native share sheet (including WhatsApp when available) or downloads the file as a fallback
- **Rename** button → saves an inline filename edit; **Undo** restores the prior filename
- **Delete** button → 2-step confirmation. While confirming, only Confirm and Cancel are shown; it auto-resets after 3 seconds.

### `UploadButton.svelte`

Drop zone that:
- Accepts clicks (native file input) or drag-and-drop
- Filters non-PDF files before processing
- Supports **multiple files** in a single drop
- Shows a spinner while encoding

### `App.svelte`

Root component that:
- Loads the PDF list on mount (`onMount`)
- Manages the toast queue (auto-dismiss after 3.5 s)
- Reactively filters the list based on the search query
- Displays the live PDF count and storage usage in the header

---

## 🔧 Configuration

### PWA Manifest (`vite.config.js`)

```js
manifest: {
  name: 'PDF Wallet',
  short_name: 'PDFWallet',
  theme_color: '#6366f1',
  background_color: '#0f0f1a',
  display: 'standalone',
  start_url: '/',
}
```

### Workbox (Service Worker)

The Workbox `generateSW` strategy pre-caches all JS, CSS, HTML, SVG and PNG assets produced by Vite. This makes the app fully functional **offline** after the first visit.

---

## 🛡️ Privacy

All data stays **100% on your device**. No files are ever uploaded to a server, no analytics are collected, and no network requests are made after the initial page load (when offline).

---

## 📜 License

[MIT](LICENSE) © 2026 — feel free to use, modify and distribute.
