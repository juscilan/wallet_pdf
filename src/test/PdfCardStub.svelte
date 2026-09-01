<script>
  import { createEventDispatcher } from 'svelte'
  import { pdfCardStubState } from './stubState.js'

  const dispatch = createEventDispatcher()
</script>

<button class="pdf-fire-deleted" data-testid="pdf-fire-deleted" on:click={() => dispatch('deleted', pdfCardStubState.deletedPayload)}>deleted</button>
<button class="pdf-fire-renamed" data-testid="pdf-fire-renamed" on:click={() => dispatch('renamed', pdfCardStubState.renamedPayload)}>renamed</button>
<button class="pdf-fire-undone" data-testid="pdf-fire-undone" on:click={() => dispatch('renameUndone', pdfCardStubState.renameUndonePayload)}>undone</button>
<button class="pdf-fire-shared" data-testid="pdf-fire-shared" on:click={() => dispatch('shared', pdfCardStubState.sharedPayload)}>shared</button>
<button class="pdf-fire-error" data-testid="pdf-fire-error" on:click={() => dispatch('error', pdfCardStubState.errorPayload)}>error</button>