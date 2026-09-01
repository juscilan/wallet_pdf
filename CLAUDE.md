# PDF Wallet

## Project conventions

- This is a Svelte 4 + Vite progressive web app. Keep components in `src/` and reusable browser-storage logic in `src/lib/`.
- PDFs are stored only in browser `localStorage`; do not add a server dependency unless explicitly requested.
- Preserve accessibility for interactive controls: use descriptive labels and ensure actions remain keyboard accessible.
- Use the native Web Share API for file sharing and retain the download fallback for browsers that do not support sharing files.
- Keep user-facing UI copy in English unless a task explicitly calls for another language.

## Verification

Run `npm run build` after changes. It is the project's available validation command and also verifies the production PWA build.
