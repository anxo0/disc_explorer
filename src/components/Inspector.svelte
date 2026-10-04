<script lang="ts">
  import { X, Clock } from '@lucide/svelte';
  import type { MediaItem } from '../lib/types';
  import { app } from '../lib/state.svelte';
  import { formatDuration } from '../lib/format';
  import { t } from '../lib/i18n/index.svelte';
  import MediaPreview from './MediaPreview.svelte';
  import ExportPanel from './ExportPanel.svelte';

  let { item }: { item: MediaItem } = $props();
</script>

<aside class="inspector" aria-label={t('inspector.label')}>
  <header>
    <span class="eyebrow">{t(`cat.${item.category}`)}</span>
    <button class="icon-btn" onclick={() => app.select(null)} aria-label={t('action.close')}><X size={17} /></button>
  </header>

  <div class="body">
    <MediaPreview {item} />

    <div class="title">
      <h2>{item.title()}</h2>
      {#if item.subtitle}<p class="mono">{item.subtitle()}</p>{/if}
      {#if item.duration}
        <span class="chip mono"><Clock size={12} /> {formatDuration(item.duration)}</span>
      {/if}
    </div>

    <dl class="meta">
      {#each item.meta() as [label, value], i (i)}
        <div class:cont={!label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      {/each}
    </dl>

    <ExportPanel {item} />
  </div>
</aside>

<style>
  .inspector {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 52px;
    padding: 0 12px 0 20px;
    border-bottom: 1px solid var(--border);
  }
  .body {
    display: grid;
    align-content: start;
    gap: 22px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 20px;
  }
  .title {
    display: grid;
    gap: 6px;
    justify-items: start;
  }
  h2 {
    font-size: 18px;
    word-break: break-word;
  }
  .title p {
    color: var(--text-3);
    font-size: 11.5px;
    word-break: break-all;
  }
  .meta {
    display: grid;
    margin: 0;
    border-top: 1px solid var(--border);
  }
  .meta > div {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    gap: 12px;
    padding: 9px 0;
    border-bottom: 1px solid var(--border);
    font-size: 12.5px;
  }
  .meta > div.cont {
    margin-top: -1px;
    padding-top: 0;
    border-top: 0;
  }
  dt {
    color: var(--text-3);
  }
  dd {
    margin: 0;
    color: var(--text);
    word-break: break-word;
  }
</style>
