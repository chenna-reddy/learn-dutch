<script lang="ts">
  import { isLoading } from "svelte-i18n";
  import Header from "./components/Header.svelte";
  import Library from "./routes/Library.svelte";
  import Reader from "./routes/Reader.svelte";
  import Settings from "./routes/Settings.svelte";
  import { route } from "./lib/router";
</script>

{#if $isLoading}
  <p class="loading">...</p>
{:else}
  <Header />
  <main>
    {#if $route.name === "library"}
      <Library />
    {:else if $route.name === "reader"}
      <Reader storyId={$route.storyId} />
    {:else if $route.name === "settings"}
      <Settings />
    {/if}
  </main>
{/if}

<style>
  main {
    padding-top: 1rem;
    padding-bottom: 3rem;
  }
  .loading {
    text-align: center;
    padding: 3rem;
    color: var(--color-muted);
  }
</style>
