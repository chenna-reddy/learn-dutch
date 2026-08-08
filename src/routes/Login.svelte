<script lang="ts">
  import { _ } from "svelte-i18n"
  import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "../lib/stores/auth"

  let mode: "login" | "signup" = "login"
  let email = ""
  let password = ""
  let displayName = ""
  let error = ""
  let busy = false

  async function google() {
    error = ""
    busy = true
    try {
      await signInWithGoogle()
    } catch (e: any) {
      error = e?.message ?? String(e)
    } finally {
      busy = false
    }
  }

  async function submit() {
    error = ""
    busy = true
    try {
      if (mode === "login") {
        await signInWithEmail(email, password)
      } else {
        await signUpWithEmail(email, password, displayName || email)
      }
    } catch (e: any) {
      error = e?.message ?? String(e)
    } finally {
      busy = false
    }
  }
</script>

<section class="container login">
  <div class="card panel">
    <h1>{$_("app.title")}</h1>
    <p class="tagline">{$_("app.tagline")}</p>

    <button class="btn-primary google" on:click={google} disabled={busy}>
      <span class="g">G</span>
      {$_("auth.signInGoogle")}
    </button>

    <div class="divider">
      <span>{$_("auth.or")}</span>
    </div>

    <form on:submit|preventDefault={submit}>
      {#if mode === "signup"}
        <label>
          {$_("auth.name")}
          <input type="text" bind:value={displayName} required />
        </label>
      {/if}
      <label>
        {$_("auth.email")}
        <input type="email" bind:value={email} required autocomplete="email" />
      </label>
      <label>
        {$_("auth.password")}
        <input
          type="password"
          bind:value={password}
          required
          minlength={6}
          autocomplete={mode === "login" ? "current-password" : "new-password"}
        />
      </label>

      <button class="btn-primary" type="submit" disabled={busy}>
        {mode === "login" ? $_("auth.signIn") : $_("auth.signUp")}
      </button>
    </form>

    <button
      class="btn-ghost toggle"
      on:click={() => (mode = mode === "login" ? "signup" : "login")}
    >
      {mode === "login" ? $_("auth.needAccount") : $_("auth.haveAccount")}
    </button>

    {#if error}
      <p class="error">{error}</p>
    {/if}
  </div>
</section>

<style>
  .login {
    display: flex;
    justify-content: center;
    padding-top: 2rem;
  }
  .panel {
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .tagline {
    color: var(--color-muted);
    margin: -0.5rem 0 0.5rem;
  }
  .google {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    background: white;
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }
  .google:hover:not(:disabled) {
    background: var(--color-bg);
  }
  .g {
    background: var(--color-primary);
    color: white;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.85rem;
  }
  .divider {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-muted);
    font-size: 0.85rem;
  }
  .divider::before,
  .divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--color-border);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9rem;
  }
  input {
    font-size: 1rem;
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
    border: 1px solid var(--color-border);
  }
  .toggle {
    color: var(--color-primary);
    font-size: 0.9rem;
  }
  .error {
    color: var(--color-danger);
    background: rgba(239, 68, 68, 0.1);
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    margin: 0;
    font-size: 0.9rem;
  }
</style>
