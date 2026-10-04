<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/state.svelte';
  import Sidebar from './Sidebar.svelte';
  import FileBrowser from './FileBrowser.svelte';
  import Inspector from './Inspector.svelte';
</script>

<div class="explorer" class:has-inspector={!!app.selected}>
  <Sidebar />
  <FileBrowser />
  {#if app.selected}
    {#key app.selected.id}
      <div class="inspector-slot" in:fly={{ x: 24, duration: 280, easing: cubicOut }}>
        <Inspector item={app.selected} />
      </div>
    {/key}
  {/if}
</div>

<style>
  .explorer {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    height: calc(100dvh - var(--topbar-h) - var(--player-h));
    transition: height 0.25s var(--ease-out);
  }
  .explorer.has-inspector {
    grid-template-columns: 260px minmax(0, 1fr) minmax(340px, 400px);
  }
  .inspector-slot {
    min-height: 0;
    border-left: 1px solid var(--border);
    background: var(--bg-elev);
  }
  @media (max-width: 1180px) {
    .explorer.has-inspector {
      grid-template-columns: 220px minmax(0, 1fr) minmax(320px, 360px);
    }
  }
  @media (max-width: 900px) {
    .explorer,
    .explorer.has-inspector {
      grid-template-columns: minmax(0, 1fr);
    }
    .explorer :global(.sidebar) {
      display: none;
    }
    .inspector-slot {
      position: fixed;
      inset: var(--topbar-h) 0 var(--player-h) 0;
      z-index: 50;
      border-left: 0;
    }
  }
</style>
