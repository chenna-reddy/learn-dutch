<script lang="ts">
  import { isLoading } from "svelte-i18n";
  import Header from "./components/Header.svelte";
  import Library from "./routes/Library.svelte";
  import Reader from "./routes/Reader.svelte";
  import Settings from "./routes/Settings.svelte";
  import Students from "./routes/Students.svelte";
  import Login from "./routes/Login.svelte";
  import { route } from "./lib/router";
  import { authReady, isSignedIn } from "./lib/stores/auth";
</script>

{#if $isLoading || !$authReady}
  <p class="loading">...</p>
{:else}
  <Header />
  <main>
    {#if !$isSignedIn}
      <Login />
    {:else if $route.name === "library"}
      <Library />
    {:else if $route.name === "reader"}
      <Reader storyId={$route.storyId} />
    {:else if $route.name === "settings"}
      <Settings />
    {:else if $route.name === "students"}
      <Students />
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
