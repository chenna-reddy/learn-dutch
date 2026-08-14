<script lang="ts">
  import { onMount, onDestroy } from "svelte"
  import { _ } from "svelte-i18n"
  import { loadStory } from "../lib/services/stories"
  import { loadUploadedStory } from "../lib/services/uploadedStories"
  import { speak, stopSpeaking } from "../lib/services/tts"
  import { recognize, webSpeechSupported } from "../lib/services/recognition"
  import type {
    FluencyResult,
    PartialUpdate,
    RecognitionHandle,
  } from "../lib/services/recognition"
  import {
    getStoryProgress,
    markOpened,
    recordAttempt,
    setCompleted,
    setCurrentSentence,
    progressStore,
  } from "../lib/stores/progress"
  import { settingsStore } from "../lib/stores/settings"
  import { user } from "../lib/stores/auth"
  import type { Story } from "../lib/types"
  import { navigate } from "../lib/router"
  import { translateWord, stripPunctuation, getCached } from "../lib/services/translation"

  export let storyId: string

  const speedPresets = [
    { i18n: "reader.speed.verySlow", value: 0.55, emoji: "🐢" },
    { i18n: "reader.speed.slow", value: 0.75, emoji: "🚶" },
    { i18n: "reader.speed.normal", value: 1.0, emoji: "🏃" },
    { i18n: "reader.speed.fast", value: 1.25, emoji: "🐇" },
  ]

  function setSpeed(value: number) {
    settingsStore.update((s) => ({ ...s, ttsRate: value }))
    if (isSpeaking) {
      stopSpeaking()
      isSpeaking = false
      handleListen()
    }
  }

  let story: Story | undefined
  let index = 0
  let loading = true
  let isSpeaking = false
  let isListening = false
  let handle: RecognitionHandle | null = null
  let lastResult: FluencyResult | null = null
  let partial: PartialUpdate | null = null

  let selectedWord: string = ""
  let selectedClean: string = ""
  let popupX = 0
  let popupY = 0
  let translated = ""
  let translating = false
  let showPopup = false
  let leaving = false

  $: current = story?.sentences[index] ?? ""
  $: words = splitWords(current)
  $: progress = $progressStore.stories[storyId]
  $: total = story?.sentences.length ?? 0
  $: canRecognize = webSpeechSupported() || $settingsStore.scoringMode === "azure"

  onMount(async () => {
    story = await loadStory(storyId)
    if (!story && $user) {
      story = await loadUploadedStory($user.uid, storyId)
    }
    if (!story) {
      loading = false
      return
    }
    markOpened(storyId)
    const saved = getStoryProgress(storyId)
    if (saved) {
      if (saved.completed) {
        index = 0
      } else if (saved.currentSentenceIndex < story.sentences.length) {
        index = saved.currentSentenceIndex
      }
    }
    loading = false
  })

  onDestroy(() => {
    stopSpeaking()
    handle?.stop()
  })

  async function handleListen() {
    if (!current) return
    if (isSpeaking) {
      stopSpeaking()
      isSpeaking = false
      return
    }
    lastResult = null
    isSpeaking = true
    try {
      await speak(
        {
          text: current,
          onEnd: () => (isSpeaking = false),
          onError: () => (isSpeaking = false),
        },
        $settingsStore
      )
    } catch (err) {
      isSpeaking = false
      console.warn("Speak failed", err)
    }
  }

  async function handleSpeak() {
    if (!current) return
    if (isListening && handle) {
      handle.stop()
      return
    }
    lastResult = null
    partial = null
    isListening = true
    try {
      handle = await recognize(current, $settingsStore, {
        onPartial: (u) => (partial = u),
      })
      const result = await handle.promise
      lastResult = result
      recordAttempt(storyId, {
        sentenceIndex: index,
        score: result.score,
        transcript: result.transcript,
        at: new Date().toISOString(),
      })
      if ($settingsStore.autoAdvance && result.score === 100 && index < (story?.sentences.length ?? 0) - 1) {
        leaving = true
        await new Promise((r) => setTimeout(r, 350))
        goNext()
        leaving = false
      }
    } catch (err) {
      console.warn("Recognition error", err)
    } finally {
      isListening = false
      handle = null
      partial = null
    }
  }

  function goPrev() {
    stopSpeaking()
    lastResult = null
    index = Math.max(0, index - 1)
    setCurrentSentence(storyId, index)
  }

  function goNext() {
    stopSpeaking()
    lastResult = null
    if (!story) return
    if (index < story.sentences.length - 1) {
      index++
      setCurrentSentence(storyId, index)
      if (index === story.sentences.length - 1 && !progress?.completed) {
        setCompleted(storyId, true)
      }
    }
  }

  function jumpTo(i: number) {
    stopSpeaking()
    lastResult = null
    index = i
    setCurrentSentence(storyId, i)
  }

  function splitWords(text: string): string[] {
    return text.split(/(\s+)/).filter((w) => w.trim().length > 0)
  }

  function handleWordClick(e: MouseEvent, word: string) {
    e.stopPropagation()
    const clean = stripPunctuation(word)
    if (!clean) return

    selectedWord = word
    selectedClean = clean
    popupX = (e as any).clientX ?? 0
    popupY = (e as any).clientY ?? 0
    showPopup = true
    translated = getCached(clean) ?? ""

    if ($settingsStore.translationSource === "azure" && !translated) {
      translating = true
      translateWord(clean)
        .then((t) => {
          translated = t
        })
        .catch((err) => {
          console.warn("Translation failed", err)
          translated = ""
        })
        .finally(() => {
          translating = false
        })
    }
  }

  function closePopup() {
    showPopup = false
    selectedWord = ""
    selectedClean = ""
    translated = ""
    translating = false
  }

  function speakWord() {
    if (!selectedClean) return
    speak({ text: selectedClean, rate: $settingsStore.ttsRate }, $settingsStore)
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") closePopup()
  }
</script>

<svelte:window on:click={closePopup} on:keydown={onKeydown} />

{#if loading}
  <section class="container"><p>...</p></section>
{:else if !story}
  <section class="container">
    <p>Story not found.</p>
    <button class="btn-primary" on:click={() => navigate({ name: "library" })}
      >{$_("reader.backToLibrary")}</button
    >
  </section>
{:else}
  <section class="container reader">
    <button class="btn-ghost back" on:click={() => navigate({ name: "library" })}
      >&larr; {$_("reader.backToLibrary")}</button
    >

    <header class="story-header">
      <h1>{story.title}</h1>
      <span class="grade">{story.grade ? story.grade.toUpperCase() : story.level}</span>
    </header>

    <p class="progress-label">
      {$_("reader.sentenceOf", { values: { current: index + 1, total } })}
    </p>

    <div class="sentence-card card" class:leaving>
      {#if lastResult}
        <p class="sentence">
          {#each lastResult.wordMatches as w, i}
            <span
              class={w.matched ? "word ok" : "word miss"}
              role="button"
              tabindex="0"
              on:click={(e) => handleWordClick(e, w.expected)}
              on:keypress={(e) =>
                e.key === "Enter" && handleWordClick(e as any, w.expected)}
              >{w.expected}</span
            >{#if i < lastResult.wordMatches.length - 1}<span>&nbsp;</span>{/if}
          {/each}
        </p>
      {:else}
        <p class="sentence">
          {#each words as word, i}
            <span
              class="word-clickable"
              role="button"
              tabindex="0"
              on:click={(e) => handleWordClick(e, word)}
              on:keypress={(e) => e.key === "Enter" && handleWordClick(e as any, word)}
              >{word}</span
            >{#if i < words.length - 1}<span>&nbsp;</span>{/if}
          {/each}
        </p>
      {/if}

      {#if lastResult}
        <div class="score-row">
          <span class="score-chip">
            {$_("reader.score")}: <strong>{lastResult.score}</strong>
          </span>
          <span class="score-chip">A: {lastResult.accuracy}</span>
          <span class="score-chip">C: {lastResult.completeness}</span>
          {#if lastResult.fluency != null}
            <span class="score-chip">F: {lastResult.fluency}</span>
          {/if}
          {#if lastResult.prosody != null}
            <span class="score-chip">P: {lastResult.prosody}</span>
          {/if}
        </div>
      {/if}

      {#if isListening}
        <div class="listen-hint">
          <span class="pulse" aria-hidden="true"></span>
          <span>{$_("reader.listeningHint")}</span>
          {#if partial}
            <span class="progress-count">
              {partial.matchedWordCount} / {partial.totalWordCount}
            </span>
          {/if}
        </div>
      {/if}

      {#if showPopup}
        <div
          class="word-popup card"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          style="left: {Math.min(popupX, window.innerWidth - 280)}px; top: {popupY +
            16}px;"
          on:click|stopPropagation={() => {}}
          on:keydown|stopPropagation={() => {}}
        >
          <div class="popup-header">
            <span class="popup-word">{selectedClean}</span>
            <button class="btn-ghost popup-close" on:click={closePopup}>&times;</button>
          </div>
          <div class="popup-body">
            <button class="btn-primary popup-speak" on:click={speakWord}>
              🔊 {$_("reader.listen")}
            </button>
            {#if $settingsStore.translationSource === "none"}
              <p class="popup-note">{$_("reader.translationDisabled")}</p>
            {:else if translating}
              <p class="popup-note">{$_("reader.translating")}...</p>
            {:else if translated}
              <p class="popup-translation">{translated}</p>
            {:else}
              <p class="popup-note">{$_("reader.noTranslation")}</p>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <div class="controls">
      <button class="btn-primary" on:click={handleListen}>
        {isSpeaking ? $_("reader.stop") : $_("reader.listen")}
      </button>
      <button class="btn-secondary" on:click={handleSpeak} disabled={!canRecognize}>
        {isListening ? $_("reader.stopSpeaking") : $_("reader.speak")}
      </button>
    </div>

    <div class="speed-row">
      <span class="speed-label">{$_("reader.speed")}</span>
      <div class="speed-toggle">
        {#each speedPresets as p}
          <button
            class:active={Math.abs($settingsStore.ttsRate - p.value) < 0.03}
            on:click={() => setSpeed(p.value)}
            aria-label={$_(p.i18n)}
            title={$_(p.i18n)}
          >
            {p.emoji} <span class="speed-name">{$_(p.i18n)}</span>
          </button>
        {/each}
      </div>
      <span class="speed-value">{$settingsStore.ttsRate.toFixed(2)}x</span>
    </div>

    <div class="nav-row">
      <button class="btn-ghost" on:click={goPrev} disabled={index === 0}>
        &larr; {$_("reader.prev")}
      </button>
      <label class="auto-advance">
        <input
          type="checkbox"
          checked={$settingsStore.autoAdvance}
          on:change={() =>
            settingsStore.update((s) => ({
              ...s,
              autoAdvance: !s.autoAdvance,
            }))}
        />
        <span>{$_("reader.autoAdvance")}</span>
      </label>
      <button class="btn-ghost" on:click={goNext} disabled={index >= total - 1}>
        {$_("reader.next")} &rarr;
      </button>
    </div>

    <details class="jump">
      <summary>{$_("reader.jumpTo")}</summary>
      <ol class="jump-list">
        {#each story.sentences as s, i}
          <li>
            <button
              class="btn-ghost jump-item"
              class:current={i === index}
              on:click={() => jumpTo(i)}
            >
              <span class="jump-num">{i + 1}.</span>
              <span class="jump-text">{s}</span>
            </button>
          </li>
        {/each}
      </ol>
    </details>
  </section>
{/if}

<style>
  .reader {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .back {
    align-self: flex-start;
    padding-left: 0;
    color: var(--color-muted);
  }
  .story-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .story-header h1 {
    margin: 0;
  }
  .grade {
    background: var(--color-primary);
    color: white;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .progress-label {
    color: var(--color-muted);
    margin: 0;
  }
  .sentence-card {
    min-height: 8rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1rem;
    transition: transform 0.35s ease-out, opacity 0.35s ease-out;
    max-width: 100%;
    overflow: hidden;
  }
  .sentence-card.leaving {
    transform: translateX(-30px);
    opacity: 0;
  }
  .sentence {
    font-size: 1.7rem;
    line-height: 1.4;
    margin: 0;
    text-align: center;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
  }
  .word.ok {
    color: var(--color-success);
  }
  .word.miss {
    color: var(--color-danger);
    text-decoration: underline wavy;
  }
  .word-clickable,
  .word {
    cursor: pointer;
    border-radius: 4px;
    padding: 0.1rem 0.15rem;
    transition: background 0.1s ease;
  }
  .word-clickable:hover,
  .word:hover {
    background: rgba(11, 107, 203, 0.12);
  }
  .word-popup {
    position: fixed;
    z-index: 50;
    min-width: 220px;
    max-width: 280px;
    padding: 0.75rem 1rem;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--color-border);
  }
  .popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .popup-word {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text);
  }
  .popup-close {
    padding: 0.15rem 0.4rem;
    font-size: 1.2rem;
    line-height: 1;
    border-radius: 6px;
    color: var(--color-muted);
  }
  .popup-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .popup-speak {
    font-size: 0.9rem;
    padding: 0.4rem 0.75rem;
    min-width: 0;
    align-self: flex-start;
  }
  .popup-translation {
    margin: 0;
    font-size: 1rem;
    color: var(--color-text);
  }
  .popup-note {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-muted);
  }
  .score-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }
  .score-chip {
    background: var(--color-bg);
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    font-size: 0.85rem;
  }
  .listen-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    color: var(--color-muted);
    font-size: 0.95rem;
  }
  .pulse {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: var(--color-danger);
    animation: pulse 1s ease-in-out infinite;
  }
  .progress-count {
    background: rgba(11, 107, 203, 0.1);
    color: var(--color-primary);
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.85rem;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(1.25);
    }
  }
  .controls {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  .controls button {
    min-width: 8rem;
    font-size: 1.05rem;
    padding: 0.85rem 1.5rem;
  }
  .speed-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  .speed-label {
    color: var(--color-muted);
    font-size: 0.9rem;
  }
  .speed-toggle {
    display: inline-flex;
    background: white;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    padding: 0.15rem;
    gap: 0.15rem;
  }
  .speed-toggle button {
    background: transparent;
    color: var(--color-text);
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    font-size: 0.9rem;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
  .speed-toggle button.active {
    background: var(--color-primary);
    color: white;
  }
  .speed-value {
    color: var(--color-muted);
    font-size: 0.85rem;
    min-width: 3rem;
    text-align: right;
  }
  @media (max-width: 500px) {
    .speed-name {
      display: none;
    }
  }
  .nav-row {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .jump summary {
    cursor: pointer;
    color: var(--color-primary);
    padding: 0.25rem 0;
  }
  .jump-list {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .jump-item {
    text-align: left;
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    width: 100%;
  }
  .jump-item:hover {
    background: var(--color-bg);
  }
  .jump-item.current {
    background: rgba(11, 107, 203, 0.1);
    color: var(--color-primary);
    font-weight: 600;
  }
  .jump-num {
    color: var(--color-muted);
    min-width: 2ch;
  }
</style>
