# PDF Wallet development skill

Use this guide when changing the PDF Wallet interface or storage behavior.

1. Inspect the related Svelte component and `src/lib/pdfStore.js` before editing.
2. Keep the in-memory `pdfs` list in `App.svelte` synchronized with changes persisted through the store helpers.
3. For destructive actions, retain the explicit confirmation flow and hide unrelated card actions while confirming.
4. Prefer device-native behaviors where available, such as the Web Share sheet for WhatsApp and other share targets.
5. Run `npm run build` and `git diff --check` before handing off changes.
