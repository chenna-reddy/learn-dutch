<script lang="ts">
  import { _ } from "svelte-i18n"
  import { user, signOutUser } from "../lib/stores/auth"
  import { students, activeStudent, activeStudentId } from "../lib/stores/students"
  import { navigate } from "../lib/router"

  let open = false
  let root: HTMLDivElement

  function toggle() {
    open = !open
  }

  function close() {
    open = false
  }

  function onClickOutside(event: MouseEvent) {
    if (root && !root.contains(event.target as Node)) close()
  }

  function switchTo(id: string) {
    activeStudentId.set(id)
    close()
  }

  function goStudents() {
    navigate({ name: "students" })
    close()
  }

  async function signOut() {
    close()
    await signOutUser()
  }
</script>

<svelte:window on:click={onClickOutside} />

<div class="account" bind:this={root}>
  <button class="trigger" on:click={toggle} aria-label={$_("account.menu")}>
    {#if $activeStudent}
      <span class="avatar" style="background: {$activeStudent.avatarColor}"
        >{$activeStudent.name.charAt(0).toUpperCase()}</span
      >
      <span class="active-name">{$activeStudent.name}</span>
    {:else}
      <span class="avatar" style="background: var(--color-muted)">?</span>
    {/if}
    <span class="chev" aria-hidden="true">▾</span>
  </button>

  {#if open}
    <div class="menu card" role="menu">
      {#if $user}
        <div class="user-block">
          <div class="user-name">{$user.displayName || $user.email}</div>
          {#if $user.email && $user.displayName}
            <div class="user-email">{$user.email}</div>
          {/if}
        </div>
        <div class="divider"></div>
      {/if}

      {#if $students.length > 0}
        <div class="section-label">{$_("account.students")}</div>
        <ul class="student-list">
          {#each $students as s (s.id)}
            <li>
              <button
                class="student-btn"
                class:current={$activeStudent?.id === s.id}
                on:click={() => switchTo(s.id)}
              >
                <span class="avatar sm" style="background: {s.avatarColor}"
                  >{s.name.charAt(0).toUpperCase()}</span
                >
                <span class="student-name">{s.name}</span>
                {#if $activeStudent?.id === s.id}
                  <span class="check" aria-hidden="true">✓</span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
        <div class="divider"></div>
      {/if}

      <button class="menu-item" on:click={goStudents}
        >{$_("account.manageStudents")}</button
      >
      <button class="menu-item danger" on:click={signOut}>{$_("account.signOut")}</button>
    </div>
  {/if}
</div>

<style>
  .account {
    position: relative;
  }
  .trigger {
    background: transparent;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.55rem;
    border-radius: 999px;
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }
  .trigger:hover {
    background: var(--color-bg);
  }
  .avatar {
    width: 1.8rem;
    height: 1.8rem;
    border-radius: 50%;
    color: white;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
  }
  .avatar.sm {
    width: 1.6rem;
    height: 1.6rem;
    font-size: 0.8rem;
  }
  .active-name {
    font-size: 0.9rem;
    max-width: 8ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chev {
    color: var(--color-muted);
    font-size: 0.7rem;
  }
  .menu {
    position: absolute;
    right: 0;
    top: calc(100% + 0.5rem);
    min-width: 240px;
    padding: 0.5rem 0;
    box-shadow: var(--shadow-md);
    z-index: 20;
    background: white;
  }
  .user-block {
    padding: 0.4rem 0.9rem 0.6rem;
  }
  .user-name {
    font-weight: 600;
    line-height: 1.2;
  }
  .user-email {
    font-size: 0.8rem;
    color: var(--color-muted);
  }
  .divider {
    height: 1px;
    background: var(--color-border);
    margin: 0.35rem 0;
  }
  .section-label {
    font-size: 0.75rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.25rem 0.9rem;
  }
  .student-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .student-btn,
  .menu-item {
    background: transparent;
    border-radius: 0;
    width: 100%;
    text-align: left;
    padding: 0.55rem 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.95rem;
    color: var(--color-text);
  }
  .student-btn:hover,
  .menu-item:hover {
    background: var(--color-bg);
  }
  .student-btn.current {
    background: rgba(11, 107, 203, 0.06);
    font-weight: 600;
  }
  .student-name {
    flex: 1;
  }
  .check {
    color: var(--color-primary);
    font-weight: 700;
  }
  .menu-item.danger {
    color: var(--color-danger);
  }
  @media (max-width: 560px) {
    .active-name {
      display: none;
    }
  }
</style>
