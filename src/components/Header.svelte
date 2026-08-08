<script lang="ts">
  import { _, locale } from "svelte-i18n"
  import { setLocale } from "../lib/i18n"
  import { navigate, route } from "../lib/router"
  import { isSignedIn } from "../lib/stores/auth"
  import AccountMenu from "./AccountMenu.svelte"

  function goLibrary() {
    navigate({ name: "library" })
  }
  function goSettings() {
    navigate({ name: "settings" })
  }
  function goProgress() {
    navigate({ name: "progress" })
  }
</script>

<header class="header">
  <div class="container header-inner">
    <button class="brand btn-ghost" on:click={goLibrary}>
      <span class="brand-mark">NL</span>
      <span class="brand-title">{$_("app.title")}</span>
    </button>
    <nav class="nav">
      {#if $isSignedIn}
        <button
          class="btn-ghost"
          class:active={$route.name === "library"}
          on:click={goLibrary}>{$_("nav.library")}</button
        >
        <button
          class="btn-ghost"
          class:active={$route.name === "progress"}
          on:click={goProgress}>{$_("nav.progress")}</button
        >
        <button
          class="btn-ghost"
          class:active={$route.name === "settings"}
          on:click={goSettings}>{$_("nav.settings")}</button
        >
      {/if}
      <div class="lang-toggle">
        <button class:active={$locale?.startsWith("nl")} on:click={() => setLocale("nl")}
          >NL</button
        >
        <button class:active={$locale?.startsWith("en")} on:click={() => setLocale("en")}
          >EN</button
        >
      </div>
      {#if $isSignedIn}
        <AccountMenu />
      {/if}
    </nav>
  </div>
</header>

<style>
  .header {
    background: white;
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--color-text);
    padding-left: 0;
  }
  .brand-mark {
    background: var(--color-primary);
    color: white;
    padding: 0.25rem 0.55rem;
    border-radius: 8px;
    font-size: 0.85rem;
    letter-spacing: 0.05em;
  }
  .nav {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .nav .active {
    background: rgba(11, 107, 203, 0.1);
    color: var(--color-primary);
    font-weight: 600;
  }
  .lang-toggle {
    display: flex;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    overflow: hidden;
  }
  .lang-toggle button {
    background: transparent;
    padding: 0.35rem 0.75rem;
    border-radius: 0;
    font-size: 0.85rem;
    color: var(--color-muted);
  }
  .lang-toggle button.active {
    background: var(--color-primary);
    color: white;
  }
  @media (max-width: 560px) {
    .brand-title {
      display: none;
    }
  }
</style>
