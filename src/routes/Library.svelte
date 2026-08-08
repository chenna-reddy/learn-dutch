<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { _ } from "svelte-i18n"
  import { loadAllStories } from "../lib/services/stories"
  import { subscribeUploadedStories } from "../lib/services/uploadedStories"
  import { user } from "../lib/stores/auth"
  import { progressStore } from "../lib/stores/progress"
  import { navigate } from "../lib/router"
  import type { Story } from "../lib/types"
  import StoryCard from "../components/StoryCard.svelte"

  let builtInStories: Story[] = []
  let uploadedStories: Story[] = []
  let loadingBuiltIn = true
  let loadingUploaded = true

  let unsubUploaded: (() => void) | null = null

  onMount(async () => {
    builtInStories = await loadAllStories()
    loadingBuiltIn = false
  })

  $: if ($user) {
    if (unsubUploaded) unsubUploaded()
    unsubUploaded = subscribeUploadedStories($user.uid, (list) => {
      uploadedStories = list
      loadingUploaded = false
    })
  }

  onDestroy(() => {
    if (unsubUploaded) unsubUploaded()
  })

  $: stories = [...uploadedStories, ...builtInStories]
  $: loading = loadingBuiltIn || loadingUploaded
</script>

<section class="container">
  <div class="header-row">
    <div>
      <h1>{$_("library.title")}</h1>
      <p class="tagline">{$_("app.tagline")}</p>
    </div>
    <button class="btn-primary add-btn" on:click={() => navigate({ name: "addStory" })}>
      + {$_("library.addStory")}
    </button>
  </div>

  {#if loading}
    <p>...</p>
  {:else if stories.length === 0}
    <p>{$_("library.empty")}</p>
  {:else}
    <div class="grid">
      {#each stories as story (story.id)}
        <StoryCard {story} progress={$progressStore.stories[story.id]} />
      {/each}
    </div>
  {/if}
</section>

<style>
  .header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .tagline {
    color: var(--color-muted);
    margin-top: -0.25rem;
    margin-bottom: 1.5rem;
  }
  .add-btn {
    padding: 0.6rem 1.2rem;
    font-size: 1rem;
    white-space: nowrap;
  }
  .grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
</style>
