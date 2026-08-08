<script lang="ts">
  import { _ } from "svelte-i18n";
  import { settingsStore } from "../lib/stores/settings";
  import { resetProgress } from "../lib/stores/progress";

  function updateVoice(e: Event) {
    const v = (e.target as HTMLSelectElement).value as "local" | "neural";
    settingsStore.update((s) => ({ ...s, voiceQuality: v }));
  }

  function updateScoring(e: Event) {
    const v = (e.target as HTMLSelectElement).value as "local" | "azure";
    settingsStore.update((s) => ({ ...s, scoringMode: v }));
  }

  function updateRate(e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    settingsStore.update((s) => ({ ...s, ttsRate: v }));
  }

  function updateTranslation(e: Event) {
    const v = (e.target as HTMLSelectElement).value as "azure" | "none";
    settingsStore.update((s) => ({ ...s, translationSource: v }));
  }

  function reset() {
    if (confirm($_("settings.resetConfirm"))) resetProgress();
  }
</script>

<section class="container">
  <h1>{$_("settings.title")}</h1>

  <div class="card group">
    <label>
      {$_("settings.voiceQuality")}
      <select value={$settingsStore.voiceQuality} on:change={updateVoice}>
        <option value="local">{$_("settings.voiceLocal")}</option>
        <option value="neural">{$_("settings.voiceNeural")}</option>
      </select>
    </label>

    <label>
      {$_("settings.scoring")}
      <select value={$settingsStore.scoringMode} on:change={updateScoring}>
        <option value="local">{$_("settings.scoringLocal")}</option>
        <option value="azure">{$_("settings.scoringAzure")}</option>
      </select>
    </label>

    <label>
      {$_("settings.translation")}
      <select value={$settingsStore.translationSource} on:change={updateTranslation}>
        <option value="azure">{$_("settings.translationAzure")}</option>
        <option value="none">{$_("settings.translationNone")}</option>
      </select>
    </label>

    <label>
      {$_("settings.rate")}
      <input
        type="range"
        min="0.4"
        max="1.5"
        step="0.05"
        value={$settingsStore.ttsRate}
        on:input={updateRate}
      />
      <span class="rate-val">{$settingsStore.ttsRate.toFixed(2)}x</span>
    </label>
  </div>

  <div class="card group danger">
    <button class="btn-secondary" on:click={reset}>{$_("settings.reset")}</button>
  </div>
</section>

<style>
  .group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-weight: 500;
  }
  select,
  input[type="range"] {
    font-size: 1rem;
    padding: 0.5rem;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: white;
  }
  .rate-val {
    align-self: flex-start;
    color: var(--color-muted);
    font-size: 0.85rem;
  }
  .danger {
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
</style>
