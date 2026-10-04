<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { app } from '../lib/state.svelte';
  import { tn, t } from '../lib/i18n/index.svelte';
  import DiscArt from './DiscArt.svelte';
</script>

<div class="overlay" transition:fade={{ duration: 180 }} role="status" aria-live="polite">
  <div class="panel" transition:scale={{ start: 0.96, duration: 240 }}>
    <DiscArt size={96} fast />
    <div class="text">
      <strong>{t('scan.title')}</strong>
      <span>{app.scanning?.count ? tn('scan.files', app.scanning.count) : t('scan.waiting')}</span>
      {#if app.scanning?.current}
        <code class="mono">{app.scanning.current}</code>
      {/if}
    </div>
    <p class="hint">{t('scan.hint')}</p>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: grid;
    place-items: center;
    padding: 16px;
    background: color-mix(in srgb, var(--bg) 65%, transparent);
    backdrop-filter: blur(10px);
  }
  .panel {
    display: grid;
    justify-items: center;
    gap: 18px;
    width: min(420px, 100%);
    padding: 32px 28px 24px;
    border-radius: var(--radius-xl);
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
    text-align: center;
  }
  .text {
    display: grid;
    gap: 4px;
    width: 100%;
  }
  strong {
    font-size: 17px;
    font-weight: 600;
  }
  span {
    color: var(--text-2);
  }
  code {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11.5px;
    color: var(--text-3);
  }
  .hint {
    color: var(--text-3);
    font-size: 12px;
  }
</style>
