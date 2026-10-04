<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { X, FolderDown } from '@lucide/svelte';
  import { app } from '../lib/state.svelte';
  import { i18n, t } from '../lib/i18n/index.svelte';
  import TopBar from './TopBar.svelte';
  import Landing from './Landing.svelte';
  import Explorer from './Explorer.svelte';
  import ScanOverlay from './ScanOverlay.svelte';
  import JobsTray from './JobsTray.svelte';
  import PlayerBar from './PlayerBar.svelte';

  let { desktopUrl }: { desktopUrl: string } = $props();

  let dragDepth = $state(0);

  onMount(() => {
    document.documentElement.lang = i18n.lang;
  });

  // La altura del reproductor se expone como variable CSS global para que los paneles fijos la respeten.
  $effect(() => {
    document.documentElement.style.setProperty('--player-h', app.nowPlaying ? '76px' : '0px');
  });

  $effect(() => {
    document.title = app.source ? `${app.source.label} · DiscLens` : t('meta.title');
  });

  const hasFiles = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files');

  function onDragEnter(e: DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth++;
  }
  function onDragOver(e: DragEvent) {
    if (hasFiles(e)) e.preventDefault();
  }
  function onDragLeave(e: DragEvent) {
    if (hasFiles(e)) dragDepth = Math.max(0, dragDepth - 1);
  }
  function onDrop(e: DragEvent) {
    if (!hasFiles(e) || !e.dataTransfer) return;
    e.preventDefault();
    dragDepth = 0;
    app.openDrop(e.dataTransfer);
  }
</script>

<svelte:window ondragenter={onDragEnter} ondragover={onDragOver} ondragleave={onDragLeave} ondrop={onDrop} />

<div class="shell">
  <TopBar {desktopUrl} />
  {#if app.source}
    <Explorer />
  {:else}
    <Landing {desktopUrl} />
  {/if}
</div>

{#if app.scanning}
  <ScanOverlay />
{/if}

<JobsTray />
<PlayerBar />

{#if app.error}
  <div class="toast" role="alert" transition:fly={{ y: 16, duration: 250 }}>
    <span>{app.error}</span>
    <button class="icon-btn" onclick={() => (app.error = null)} aria-label={t('action.close')}><X size={16} /></button>
  </div>
{/if}

{#if dragDepth > 0}
  <div class="drop" transition:fade={{ duration: 150 }}>
    <div class="drop-inner">
      <FolderDown size={36} strokeWidth={1.5} />
      <strong>{t('drop.title')}</strong>
      <span>{t('drop.body')}</span>
    </div>
  </div>
{/if}

<style>
  .shell {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(24px + var(--player-h));
    translate: -50% 0;
    z-index: 80;
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: min(560px, calc(100vw - 32px));
    padding: 10px 10px 10px 16px;
    border-radius: var(--radius);
    background: var(--surface-2);
    border: 1px solid color-mix(in srgb, var(--danger) 40%, var(--border));
    box-shadow: var(--shadow-lg);
    color: var(--text);
    font-size: 13.5px;
  }
  .drop {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: grid;
    place-items: center;
    padding: 24px;
    background: color-mix(in srgb, var(--bg) 70%, transparent);
    backdrop-filter: blur(8px);
    pointer-events: none;
  }
  .drop-inner {
    display: grid;
    justify-items: center;
    gap: 8px;
    width: min(460px, 100%);
    padding: 48px 32px;
    border: 1.5px dashed var(--accent);
    border-radius: var(--radius-xl);
    background: var(--accent-soft);
    color: var(--accent);
    text-align: center;
  }
  .drop-inner strong {
    color: var(--text);
    font-size: 18px;
    font-weight: 600;
  }
  .drop-inner span {
    color: var(--text-2);
  }
</style>
