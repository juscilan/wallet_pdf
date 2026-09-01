<script>
  import { createEventDispatcher } from 'svelte'
  import { uploadStubState } from './stubState.js'

  const dispatch = createEventDispatcher()
</script>

<button
  class="upload-fire-added"
  data-testid="upload-fire-added"
  on:click={() => dispatch('added', uploadStubState.addedPayload)}
>fire added</button>
<button
  class="upload-fire-error"
  data-testid="upload-fire-error"
  on:click={() => dispatch('error', uploadStubState.errorPayload)}
>fire error</button>