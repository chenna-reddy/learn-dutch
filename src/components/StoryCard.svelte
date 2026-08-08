<script lang="ts">
  import { _ } from "svelte-i18n"
  import type { Story, StoryProgress } from "../lib/types"
  import { navigate } from "../lib/router"

  export let story: Story
  export let progress: StoryProgress | undefined

  $: statusLabel = progress?.completed
    ? $_("library.completed")
    : progress && progress.currentSentenceIndex > 0
      ? $_("library.inProgress")
      : $_("library.notStarted")

  $: statusClass = progress?.completed
    ? "done"
    : progress && progress.currentSentenceIndex > 0
      ? "progress"
      : "idle"

  function open() {
    navigate({ name: "reader", storyId: story.id })
  }
</script>

<button class="card story-card" on:click={open}>
  <div class="row top">
    <span class="level">{story.level}</span>
    <span class="status {statusClass}">{statusLabel}</span>
  </div>
  <h3 class="title">{story.title}</h3>
  <div class="row bottom">
    <span class="meta">
      {story.sentences.length}
      {story.sentences.length === 1 ? "zin" : "zinnen"}
    </span>
    {#if progress?.fluencyLevel}
      <span class="fluency">
        {$_("library.fluency")}: {progress.fluencyLevel}
        {#if progress.averageScore != null}
          ({progress.averageScore})
        {/if}
      </span>
    {/if}
  </div>
</button>

<style>
  .story-card {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    text-align: left;
    padding: 1rem 1.25rem;
    background: white;
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
    transition:
      transform 0.1s ease,
      box-shadow 0.15s ease;
    gap: 0.75rem;
  }
  .story-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }
  .title {
    font-size: 1.25rem;
    line-height: 1.2;
    margin: 0;
    color: var(--color-text);
  }
  .level {
    background: var(--color-primary);
    color: white;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    font-weight: 600;
  }
  .status {
    font-size: 0.78rem;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    font-weight: 600;
  }
  .status.done {
    background: rgba(34, 197, 94, 0.15);
    color: var(--color-success);
  }
  .status.progress {
    background: rgba(234, 179, 8, 0.15);
    color: #a16207;
  }
  .status.idle {
    background: rgba(107, 114, 128, 0.15);
    color: var(--color-muted);
  }
  .meta,
  .fluency {
    color: var(--color-muted);
    font-size: 0.85rem;
  }
</style>
