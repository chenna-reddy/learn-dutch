<script lang="ts">
  import { onMount } from "svelte"
  import { _ } from "svelte-i18n"
  import { loadAllStories } from "../lib/services/stories"
  import { progressStore } from "../lib/stores/progress"
  import { navigate } from "../lib/router"
  import type { Story, StoryProgress } from "../lib/types"

  let stories: Story[] = []
  let loading = true

  onMount(async () => {
    stories = await loadAllStories()
    loading = false
  })

  function goToStory(id: string) {
    navigate({ name: "reader", storyId: id })
  }

  function statusLabel(p: StoryProgress | undefined): string {
    if (!p) return $_("library.notStarted")
    if (p.completed) return $_("library.completed")
    if (p.currentSentenceIndex > 0) return $_("library.inProgress")
    return $_("library.notStarted")
  }

  function statusClass(p: StoryProgress | undefined): string {
    if (!p) return "idle"
    if (p.completed) return "done"
    if (p.currentSentenceIndex > 0) return "progress"
    return "idle"
  }

  function fmtDate(iso: string | undefined): string {
    if (!iso) return "-"
    try {
      return new Date(iso).toLocaleDateString()
    } catch {
      return iso
    }
  }
</script>

<section class="container">
  <h1>{$_("progress.title")}</h1>
  <p class="tagline">{$_("progress.tagline")}</p>

  {#if loading}
    <p>...</p>
  {:else if stories.length === 0}
    <p>{$_("library.empty")}</p>
  {:else}
    <div class="table-wrapper card">
      <table>
        <thead>
          <tr>
            <th>{$_("progress.story")}</th>
            <th>{$_("library.level")}</th>
            <th>{$_("progress.status")}</th>
            <th>{$_("progress.position")}</th>
            <th>{$_("progress.score")}</th>
            <th>{$_("library.fluency")}</th>
            <th>{$_("progress.lastOpened")}</th>
          </tr>
        </thead>
        <tbody>
          {#each stories as story (story.id)}
            {@const p = $progressStore.stories[story.id]}
            <tr on:click={() => goToStory(story.id)}>
              <td class="story-cell">
                <strong>{story.title}</strong>
                <span class="meta"
                  >{story.sentences.length}
                  {story.sentences.length === 1 ? "zin" : "zinnen"}</span
                >
              </td>
              <td>
                <span class="level">{story.level}</span>
              </td>
              <td>
                <span class="badge {statusClass(p)}">{statusLabel(p)}</span>
              </td>
              <td>
                {#if p && story.sentences.length > 0}
                  {p.currentSentenceIndex + 1} / {story.sentences.length}
                {:else}
                  -
                {/if}
              </td>
              <td>
                {#if p?.averageScore != null}
                  <span
                    class="score"
                    class:good={p.averageScore >= 70}
                    class:great={p.averageScore >= 85}
                  >
                    {p.averageScore}
                  </span>
                {:else}
                  -
                {/if}
              </td>
              <td>
                {#if p?.fluencyLevel}
                  <span class="fluency">{p.fluencyLevel}</span>
                {:else}
                  -
                {/if}
              </td>
              <td class="date">{fmtDate(p?.lastOpenedAt)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  .tagline {
    color: var(--color-muted);
    margin-top: -0.25rem;
    margin-bottom: 1.5rem;
  }
  .table-wrapper {
    overflow-x: auto;
    padding: 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
  }
  thead th {
    text-align: left;
    padding: 0.75rem 1rem;
    font-weight: 600;
    color: var(--color-muted);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }
  tbody tr {
    cursor: pointer;
    transition: background 0.1s ease;
  }
  tbody tr:hover {
    background: var(--color-bg);
  }
  tbody td {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }
  .story-cell {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .meta {
    color: var(--color-muted);
    font-size: 0.8rem;
  }
  .level {
    background: var(--color-primary);
    color: white;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .badge {
    font-size: 0.78rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    font-weight: 600;
  }
  .badge.done {
    background: rgba(34, 197, 94, 0.15);
    color: var(--color-success);
  }
  .badge.progress {
    background: rgba(234, 179, 8, 0.15);
    color: #a16207;
  }
  .badge.idle {
    background: rgba(107, 114, 128, 0.15);
    color: var(--color-muted);
  }
  .score {
    font-weight: 700;
    color: var(--color-danger);
  }
  .score.good {
    color: #a16207;
  }
  .score.great {
    color: var(--color-success);
  }
  .fluency {
    font-weight: 700;
  }
  .date {
    color: var(--color-muted);
    font-size: 0.85rem;
    white-space: nowrap;
  }
  @media (max-width: 640px) {
    .date {
      display: none;
    }
  }
</style>
