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
  import { settingsStore } from "../lib/stores/settings"
  import { user } from "../lib/stores/auth"
  import type { Story } from "../lib/types"
  import { navigate } from "../lib/router"
  import {
    translateSentence,
    getCachedSentence,
  } from "../lib/services/translation"

  export let storyId: string

  let story: Story | undefined
  let index = 0
  let loading = true
  let isSpeaking = false
  let isListening = false
  let handle: RecognitionHandle | null = null
  let lastResult: FluencyResult | null = null
  let partial: PartialUpdate | null = null
  let showAnswer = false
  let sentenceTranslation = ""
  let sentenceTranslating = false
  let showSentenceTranslation = false

  $: currentQuestion = story?.questions?.[index]
  $: total = story?.questions?.length ?? 0
  $: canRecognize = webSpeechSupported() || $settingsStore.scoringMode === "azure"

  onMount(async () => {
    story = await loadStory(storyId)
    if (!story && $user) {
      story = await loadUploadedStory($user.uid, storyId)
    }
    loading = false
  })

  onDestroy(() => {
    stopSpeaking()
    handle?.stop()
  })

  async function handleListen() {
    if (!currentQuestion) return
    if (isSpeaking) {
      stopSpeaking()
      isSpeaking = false
      return
    }
    isSpeaking = true
    try {
      await speak(
        {
          text: currentQuestion.question,
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
    if (!currentQuestion) return
    if (isListening && handle) {
      handle.stop()
      return
    }
    lastResult = null
    partial = null
    isListening = true
    try {
      handle = await recognize(currentQuestion.question, $settingsStore, {
        onPartial: (u) => (partial = u),
      })
      const result = await handle.promise
      lastResult = result
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
    showAnswer = false
    index = Math.max(0, index - 1)
  }

  function goNext() {
    stopSpeaking()
    lastResult = null
    showAnswer = false
    if (story?.questions && index < story.questions.length - 1) {
      index++
    }
  }

  function revealAnswer() {
    showAnswer = true
  }

  async function handleTranslateSentence() {
    if (!currentQuestion) return
    if (showSentenceTranslation) {
      closeSentenceTranslation()
      return
    }
    if ($settingsStore.translationSource === "none") {
      sentenceTranslation = ""
      showSentenceTranslation = true
      return
    }
    const cached = getCachedSentence(currentQuestion.question)
    if (cached) {
      sentenceTranslation = cached
      showSentenceTranslation = true
      return
    }
    sentenceTranslating = true
    showSentenceTranslation = true
    try {
      const t = await translateSentence(currentQuestion.question)
      sentenceTranslation = t
    } catch (err) {
      console.warn("Sentence translation failed", err)
      sentenceTranslation = ""
    } finally {
      sentenceTranslating = false
    }
  }

  function closeSentenceTranslation() {
    showSentenceTranslation = false
    sentenceTranslation = ""
    sentenceTranslating = false
  }

  function setSpeed(v: number) {
    settingsStore.update((s) => ({ ...s, ttsRate: v }))
  }

  const speedPresets = [
    { i18n: "reader.speed.verySlow", value: 0.55, emoji: "🐢" },
    { i18n: "reader.speed.slow", value: 0.75, emoji: "🚶" },
    { i18n: "reader.speed.normal", value: 1.0, emoji: "🏃" },
    { i18n: "reader.speed.fast", value: 1.25, emoji: "🐇" },
  ]
</script>

{#if loading}
  <section class="container"><p>...</p></section>
{:else if !story || !story.questions || story.questions.length === 0}
  <section class="container">
    <p>{$_("questions.noQuestions")}</p>
    <button class="btn-primary" on:click={() => navigate({ name: "reader", storyId })}
      >{$_("reader.backToLibrary")}</button
    >
  </section>
{:else}
  <section class="container reader">
    <button class="btn-ghost back" on:click={() => navigate({ name: "reader", storyId })}
      >&larr; {$_("questions.backToStory")}</button
    >

    <header class="story-header">
      <h1>{story.title}</h1>
      <span class="grade">{story.grade ? story.grade.toUpperCase() : story.level}</span>
    </header>

    <p class="progress-label">
      {$_("questions.questionOf", { values: { current: index + 1, total } })}
    </p>

    <div class="sentence-card card">
      {#if currentQuestion}
        <p class="sentence">{currentQuestion.question}</p>
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
    </div>

    {#if showAnswer && currentQuestion}
      <div class="answer-card card">
        <div class="answer-header">
          <span class="answer-label">{$_("questions.answer")}</span>
        </div>
        <p class="answer-text">{currentQuestion.answer}</p>
      </div>
    {/if}

    {#if showSentenceTranslation}
      <div class="sentence-translation card">
        <div class="translation-header">
          <span class="translation-label">{$_("reader.translation")}</span>
          <button class="btn-ghost popup-close" on:click={closeSentenceTranslation}>&times;</button>
        </div>
        {#if $settingsStore.translationSource === "none"}
          <p class="popup-note">{$_("reader.translationDisabled")}</p>
        {:else if sentenceTranslating}
          <p class="popup-note">{$_("reader.translating")}...</p>
        {:else if sentenceTranslation}
          <p class="popup-translation">{sentenceTranslation}</p>
        {:else}
          <p class="popup-note">{$_("reader.noTranslation")}</p>
        {/if}
      </div>
    {/if}

    <div class="controls">
      <button class={isSpeaking ? "btn-primary" : "btn-secondary"} on:click={handleListen}>
        {isSpeaking ? $_("reader.stop") : $_("reader.listen")}
      </button>
      <button class={isListening ? "btn-primary" : "btn-secondary"} on:click={handleSpeak} disabled={!canRecognize}>
        {isListening ? $_("reader.stopSpeaking") : $_("reader.speak")}
      </button>
      <button class={showSentenceTranslation ? "btn-primary" : "btn-secondary"} on:click={handleTranslateSentence} disabled={!currentQuestion}>
        {showSentenceTranslation ? $_("reader.close") : $_("reader.translateSentence")}
      </button>
    </div>

    <div class="answer-controls">
      <button class="btn-primary answer-btn" on:click={revealAnswer} disabled={showAnswer}>
        {$_("questions.showAnswer")}
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
      <button class="btn-ghost" on:click={goNext} disabled={index >= total - 1}>
        {$_("reader.next")} &rarr;
      </button>
    </div>
  </section>
{/if}

<style>
  .back {
    margin-bottom: 0.5rem;
  }
  .story-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
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
  .sentence {
    font-size: 1.7rem;
    line-height: 1.4;
    margin: 0;
    text-align: start;
    word-break: normal;
    overflow-wrap: normal;
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
    background: var(--color-danger);
    border-radius: 50%;
    animation: pulse 1.2s infinite;
  }
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.4;
      transform: scale(1.4);
    }
  }
  .answer-card {
    padding: 1rem 1.25rem;
    background: var(--color-bg);
    border-left: 4px solid var(--color-primary);
  }
  .answer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .answer-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .answer-text {
    font-size: 1.25rem;
    line-height: 1.5;
    margin: 0;
  }
  .answer-controls {
    display: flex;
    justify-content: center;
    margin-top: 0.5rem;
  }
  .answer-btn {
    padding: 0.6rem 1.5rem;
    font-size: 1rem;
  }
  .controls {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 1rem;
  }
  .sentence-translation {
    padding: 0.75rem 1rem;
    margin: 0.5rem 0 0;
  }
  .translation-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .translation-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .popup-close {
    padding: 0.15rem 0.4rem;
    font-size: 1.2rem;
    line-height: 1;
    border-radius: 6px;
    color: var(--color-muted);
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
  .speed-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }
  .speed-label {
    color: var(--color-muted);
    font-size: 0.85rem;
  }
  .speed-toggle {
    display: flex;
    gap: 0.25rem;
  }
  .speed-toggle button {
    padding: 0.35rem 0.6rem;
    font-size: 0.85rem;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: white;
    cursor: pointer;
  }
  .speed-toggle button.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }
  .speed-name {
    margin-left: 0.25rem;
  }
  .speed-value {
    color: var(--color-muted);
    font-size: 0.85rem;
    min-width: 3rem;
  }
  .nav-row {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 1rem;
  }
</style>
