<script lang="ts">
  import { _ } from "svelte-i18n"
  import { user } from "../lib/stores/auth"
  import { createUploadedStory } from "../lib/services/uploadedStories"
  import { navigate } from "../lib/router"
  import type { CefrLevel, Story } from "../lib/types"

  const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"]
  const GRADES: { value: Story["grade"]; label: string }[] = [
    { value: null, label: "—" },
    { value: "g4", label: "Grade 4" },
    { value: "g7", label: "Grade 7" },
  ]

  let title = ""
  let content = ""
  let level: CefrLevel = "A1"
  let grade: Story["grade"] = null
  let error = ""
  let busy = false

  async function save() {
    error = ""
    if (!$user) {
      error = "not_authenticated"
      return
    }
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    if (!trimmedContent) {
      error = $_("addStory.errorContent")
      return
    }
    busy = true
    try {
      await createUploadedStory($user.uid, trimmedTitle, trimmedContent, level, grade)
      navigate({ name: "library" })
    } catch (e: any) {
      error = e?.message ?? String(e)
      busy = false
    }
  }
</script>

<section class="container">
  <h1>{$_("addStory.title")}</h1>
  <p class="tagline">{$_("addStory.tagline")}</p>

  <div class="card form">
    <label>
      <span>{$_("addStory.titleLabel")}</span>
      <input type="text" bind:value={title} maxlength="100" />
    </label>

    <label>
      <span>{$_("addStory.levelLabel")}</span>
      <select bind:value={level}>
        {#each LEVELS as l}
          <option value={l}>{l}</option>
        {/each}
      </select>
    </label>

    <label>
      <span>{$_("addStory.gradeLabel")}</span>
      <select bind:value={grade}>
        {#each GRADES as g}
          <option value={g.value}>{g.label}</option>
        {/each}
      </select>
    </label>

    <label>
      <span>{$_("addStory.contentLabel")}</span>
      <textarea bind:value={content} rows="12" maxlength="5000"></textarea>
    </label>

    <div class="hint">{$_("addStory.hint")}</div>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <div class="actions">
      <button class="btn-ghost" on:click={() => navigate({ name: "library" })}>
        {$_("common.cancel")}
      </button>
      <button class="btn-primary" on:click={save} disabled={busy || !content.trim()}>
        {busy ? $_("addStory.saving") : $_("addStory.save")}
      </button>
    </div>
  </div>
</section>

<style>
  .tagline {
    color: var(--color-muted);
    margin-top: -0.25rem;
    margin-bottom: 1.5rem;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 640px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-weight: 500;
  }
  input,
  select,
  textarea {
    font-size: 1rem;
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    font-family: inherit;
  }
  textarea {
    resize: vertical;
    line-height: 1.5;
  }
  .hint {
    color: var(--color-muted);
    font-size: 0.85rem;
  }
  .error {
    color: var(--color-danger);
    background: rgba(239, 68, 68, 0.1);
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    margin: 0;
    font-size: 0.9rem;
  }
  .actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }
</style>
