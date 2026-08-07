<script lang="ts">
  import { _ } from "svelte-i18n";
  import { user } from "../lib/stores/auth";
  import {
    students,
    activeStudent,
    activeStudentId,
  } from "../lib/stores/students";
  import {
    createStudent,
    renameStudent,
    deleteStudent,
  } from "../lib/services/students";

  let newName = "";
  let editingId: string | null = null;
  let editingName = "";
  let error = "";

  async function add() {
    error = "";
    if (!$user) return;
    const name = newName.trim();
    if (!name) return;
    try {
      await createStudent($user.uid, name);
      newName = "";
    } catch (e: any) {
      error = e?.message ?? String(e);
    }
  }

  function startEdit(id: string, currentName: string) {
    editingId = id;
    editingName = currentName;
  }

  async function saveEdit() {
    if (!$user || !editingId) return;
    try {
      await renameStudent($user.uid, editingId, editingName);
      editingId = null;
    } catch (e: any) {
      error = e?.message ?? String(e);
    }
  }

  async function remove(id: string) {
    if (!$user) return;
    if ($students.length <= 1) {
      error = $_("students.mustKeepOne");
      return;
    }
    if (!confirm($_("students.confirmDelete"))) return;
    try {
      await deleteStudent($user.uid, id);
    } catch (e: any) {
      error = e?.message ?? String(e);
    }
  }

  function makeActive(id: string) {
    activeStudentId.set(id);
  }
</script>

<section class="container">
  <h1>{$_("students.title")}</h1>
  <p class="hint">{$_("students.hint")}</p>

  <div class="card">
    <form on:submit|preventDefault={add} class="add-form">
      <input
        type="text"
        placeholder={$_("students.namePlaceholder")}
        bind:value={newName}
        maxlength="40"
      />
      <button type="submit" class="btn-primary" disabled={!newName.trim()}
        >{$_("students.add")}</button
      >
    </form>
    {#if error}
      <p class="error">{error}</p>
    {/if}
  </div>

  <ul class="student-list">
    {#each $students as s (s.id)}
      <li class="card row" class:active={$activeStudent?.id === s.id}>
        <span class="avatar" style="background: {s.avatarColor}"
          >{s.name.charAt(0).toUpperCase()}</span
        >
        {#if editingId === s.id}
          <input bind:value={editingName} maxlength="40" />
          <button class="btn-primary" on:click={saveEdit}
            >{$_("common.save")}</button
          >
          <button class="btn-ghost" on:click={() => (editingId = null)}
            >{$_("common.cancel")}</button
          >
        {:else}
          <span class="name">{s.name}</span>
          {#if $activeStudent?.id === s.id}
            <span class="badge">{$_("students.active")}</span>
          {:else}
            <button class="btn-ghost" on:click={() => makeActive(s.id)}
              >{$_("students.makeActive")}</button
            >
          {/if}
          <button
            class="btn-ghost"
            on:click={() => startEdit(s.id, s.name)}
            aria-label={$_("students.rename")}>&#9998;</button
          >
          <button
            class="btn-ghost danger"
            on:click={() => remove(s.id)}
            aria-label={$_("students.delete")}>&times;</button
          >
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  .hint {
    color: var(--color-muted);
    margin-top: -0.25rem;
  }
  .add-form {
    display: flex;
    gap: 0.5rem;
  }
  input[type="text"] {
    flex: 1;
    font-size: 1rem;
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
    border: 1px solid var(--color-border);
  }
  .student-list {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
  }
  .row.active {
    border: 2px solid var(--color-primary);
  }
  .avatar {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    color: white;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .name {
    flex: 1;
    font-weight: 600;
  }
  .badge {
    background: rgba(11, 107, 203, 0.1);
    color: var(--color-primary);
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .danger {
    color: var(--color-danger);
    font-size: 1.2rem;
  }
  .error {
    color: var(--color-danger);
    margin: 0.5rem 0 0;
    font-size: 0.9rem;
  }
</style>
