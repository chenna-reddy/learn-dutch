<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { _ } from "svelte-i18n"
  import { loadAllStories } from "../lib/services/stories"
  import { subscribeUploadedStories } from "../lib/services/uploadedStories"
  import { user } from "../lib/stores/auth"
  import { activeStudent } from "../lib/stores/students"
  import { progressStore } from "../lib/stores/progress"
  import { navigate } from "../lib/router"
  import type { Story } from "../lib/types"
  import StoryCard from "../components/StoryCard.svelte"

  let builtInStories: Story[] = []
  let uploadedStories: Story[] = []
  let loadingBuiltIn = true
  let loadingUploaded = true
  const GRADE_FILTER_KEY = "learn-dutch:gradeFilter"

  function loadGradeFilter() {
    if (typeof localStorage === "undefined") return { g4: true, g7: true }
    try {
      const raw = localStorage.getItem(GRADE_FILTER_KEY)
      if (!raw) return { g4: true, g7: true }
      const parsed = JSON.parse(raw)
      return { g4: !!parsed.g4, g7: !!parsed.g7 }
    } catch {
      return { g4: true, g7: true }
    }
  }

  function saveGradeFilter(filter: { g4: boolean; g7: boolean }) {
    if (typeof localStorage === "undefined") return
    try {
      localStorage.setItem(GRADE_FILTER_KEY, JSON.stringify(filter))
    } catch {
      // ignore
    }
  }

  let showGradeMenu = false
  let gradeFilter = loadGradeFilter()
  let dropdownEl: HTMLElement | null = null

  let unsubUploaded: (() => void) | null = null

  function handleClickOutside(e: MouseEvent) {
    if (dropdownEl && !dropdownEl.contains(e.target as Node)) {
      showGradeMenu = false
    }
  }

  function toggleMenu() {
    showGradeMenu = !showGradeMenu
    if (showGradeMenu) {
      requestAnimationFrame(() => {
        document.addEventListener("click", handleClickOutside, { once: true })
      })
    }
  }

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
    document.removeEventListener("click", handleClickOutside)
  })

  $: {
    const studentGrade = $activeStudent?.grade
    if (studentGrade) {
      if (studentGrade === "g4") {
        gradeFilter = { g4: true, g7: false }
      } else if (studentGrade === "g7") {
        gradeFilter = { g4: false, g7: true }
      }
    }
  }

  $: allStories = [...uploadedStories, ...builtInStories]
  $: stories = allStories.filter(
    (s) =>
      (s.grade === "g4" && gradeFilter.g4) ||
      (s.grade === "g7" && gradeFilter.g7) ||
      (!s.grade && gradeFilter.g4)
  )
  $: saveGradeFilter(gradeFilter)
  $: loading = loadingBuiltIn || loadingUploaded
</script>

<section class="container">
  <div class="header-row">
    <div>
      <h1>{$_("library.title")}</h1>
      <p class="tagline">{$_("app.tagline")}</p>
    </div>
    <div class="filter-row">
      <div class="dropdown" bind:this={dropdownEl}>
        <button
          class="btn-primary"
          class:outline={!gradeFilter.g4 || !gradeFilter.g7}
          on:click={toggleMenu}
        >
          Grades
        </button>
        {#if showGradeMenu}
          <div class="menu card" on:click|stopPropagation role="dialog" aria-modal="true" tabindex="-1" on:keydown={(e) => { if (e.key === 'Escape') showGradeMenu = false }}>
            <label class="item">
              <input type="checkbox" bind:checked={gradeFilter.g4} />
              <span>Grade 4</span>
            </label>
            <label class="item">
              <input type="checkbox" bind:checked={gradeFilter.g7} />
              <span>Grade 7</span>
            </label>
          </div>
        {/if}
      </div>
      <button class="btn-primary add-btn" on:click={() => navigate({ name: "addStory" })}>
        + {$_("library.addStory")}
      </button>
    </div>
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
  .filter-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .btn-primary {
    padding: 0.6rem 1.2rem;
    font-size: 1rem;
    white-space: nowrap;
  }
  .btn-primary.outline {
    background: white;
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
  }
  .add-btn {
    padding: 0.6rem 1.2rem;
    font-size: 1rem;
    white-space: nowrap;
  }
  .dropdown {
    position: relative;
  }
  .menu {
    position: absolute;
    top: calc(100% + 0.4rem);
    right: 0;
    z-index: 50;
    min-width: 160px;
    padding: 0.5rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.95rem;
  }
  .item:hover {
    background: var(--color-bg);
  }
  .item input {
    cursor: pointer;
  }
  .grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
</style>
