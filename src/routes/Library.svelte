<script lang="ts">
  import { onMount } from "svelte";
  import { _ } from "svelte-i18n";
  import { loadAllStories } from "../lib/services/stories";
  import { progressStore } from "../lib/stores/progress";
  import type { Story } from "../lib/types";
  import StoryCard from "../components/StoryCard.svelte";

  let stories: Story[] = [];
  let loading = true;

  onMount(async () => {
    stories = await loadAllStories();
    loading = false;
  });
</script>

<section class="container">
  <h1>{$_("library.title")}</h1>
  <p class="tagline">{$_("app.tagline")}</p>

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
  .tagline {
    color: var(--color-muted);
    margin-top: -0.25rem;
    margin-bottom: 1.5rem;
  }
  .grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
</style>
