<script lang="ts">
  import { Layers, Folder, FolderOpen, ShieldCheck, ChevronRight } from '@lucide/svelte';
  import { app, type Filter } from '../lib/state.svelte';
  import { CATEGORIES } from '../lib/analyze';
  import { CATEGORY_ICONS } from '../lib/icons';
  import { formatBytes, formatNumber, tn, t } from '../lib/i18n/index.svelte';

  const analysis = $derived(app.analysis!);
  const source = $derived(app.source!);
  const categories = $derived(CATEGORIES.filter((c) => analysis.totals[c].count > 0));

  function setFilter(f: Filter) {
    app.filter = f;
    app.query = '';
  }

  function openDir(dir: string) {
    app.filter = 'all';
    app.query = '';
    app.dir = dir;
  }

  const depth = (d: string) => d.split('/').length - 1;
  const leaf = (d: string) => d.split('/').pop();
  /** Solo mostramos carpetas cuyos padres están abiertos (árbol plegable sencillo). */
  const visibleDirs = $derived(
    source.dirs.filter((d) => {
      const parent = d.includes('/') ? d.slice(0, d.lastIndexOf('/')) : '';
      return parent === '' || app.dir === parent || app.dir.startsWith(`${parent}/`) || app.dir === d;
    }),
  );
</script>

<aside class="sidebar">
  <section class="disc-card">
    <div class="disc-mini" aria-hidden="true"></div>
    <div class="disc-info">
      <span class="eyebrow">{t(`disc.${analysis.type}.label`)}</span>
      <h2 title={source.label}>{source.label}</h2>
      <span class="mono stats">{formatBytes(analysis.totalSize)} · {tn('count.files', source.files.length)}</span>
    </div>
    <p class="summary">{t(`disc.${analysis.type}.summary`)}</p>
  </section>

  <nav class="group" aria-label={t('sidebar.library')}>
    <span class="eyebrow label">{t('sidebar.library')}</span>
    <button class="item" class:on={app.filter === 'all' && !app.query} onclick={() => setFilter('all')}>
      <Layers size={16} />
      <span>{t('cat.all')}</span>
      <span class="count mono">{formatNumber(source.files.length)}</span>
    </button>
    {#each categories as c (c)}
      {@const Icon = CATEGORY_ICONS[c]}
      <button class="item" class:on={app.filter === c} style:--c="var(--c-{c})" onclick={() => setFilter(c)}>
        <span class="cat-icon"><Icon size={16} /></span>
        <span>{t(`cat.${c}`)}</span>
        <span class="count mono">{formatNumber(analysis.totals[c].count)}</span>
      </button>
    {/each}
  </nav>

  {#if source.dirs.length}
    <nav class="group tree" aria-label={t('sidebar.folders')}>
      <span class="eyebrow label">{t('sidebar.folders')}</span>
      <button class="item" class:on={!app.flatMode && app.dir === ''} onclick={() => openDir('')}>
        <FolderOpen size={16} />
        <span>{t('meta.root')}</span>
      </button>
      {#each visibleDirs as d (d)}
        {@const open = app.dir === d || app.dir.startsWith(`${d}/`)}
        <button
          class="item"
          class:on={!app.flatMode && app.dir === d}
          style:padding-left="{12 + (depth(d) + 1) * 14}px"
          onclick={() => openDir(d)}
          title={`/${d}`}
        >
          <ChevronRight size={13} class={open ? 'chev open' : 'chev'} />
          {#if open}<FolderOpen size={15} />{:else}<Folder size={15} />{/if}
          <span class="mono name">{leaf(d)}</span>
        </button>
      {/each}
    </nav>
  {/if}

  <div class="readonly">
    <ShieldCheck size={15} />
    <span>{t('sidebar.readonly')}</span>
  </div>
</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 22px;
    min-height: 0;
    padding: 18px 12px;
    overflow-y: auto;
    border-right: 1px solid var(--border);
    background: var(--bg-elev);
  }
  .disc-card {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 12px;
    padding: 14px;
    border-radius: var(--radius-lg);
    background: var(--surface);
    border: 1px solid var(--border);
  }
  .disc-mini {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background:
      radial-gradient(circle, var(--surface) 0 18%, transparent 19%),
      radial-gradient(circle, rgb(255 255 255 / 0.25) 0 30%, transparent 31%),
      var(--iridescent);
    box-shadow: 0 4px 14px -4px rgb(0 0 0 / 0.4);
    animation: spin 12s linear infinite;
  }
  @keyframes spin {
    to {
      rotate: 360deg;
    }
  }
  .disc-info {
    display: grid;
    min-width: 0;
    align-content: center;
  }
  .disc-info h2 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
    font-weight: 600;
  }
  .stats {
    color: var(--text-3);
    font-size: 11.5px;
  }
  .summary {
    grid-column: 1 / -1;
    color: var(--text-2);
    font-size: 12.5px;
    line-height: 1.5;
  }
  .group {
    display: grid;
    gap: 2px;
  }
  .label {
    padding: 0 10px 6px;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 34px;
    padding: 0 10px;
    border-radius: 8px;
    color: var(--text-2);
    font-size: 13.5px;
    text-align: left;
    transition: background-color 0.15s, color 0.15s;
  }
  .item:hover {
    background: var(--hover);
    color: var(--text);
  }
  .item.on {
    background: var(--active);
    color: var(--text);
  }
  .item > span:not(.count):not(.cat-icon) {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cat-icon {
    display: grid;
    color: var(--c);
  }
  .count {
    margin-left: auto;
    color: var(--text-3);
    font-size: 11.5px;
  }
  .tree .item {
    height: 30px;
    gap: 7px;
  }
  .name {
    font-size: 12.5px;
  }
  .tree :global(.chev) {
    flex: none;
    color: var(--text-3);
    transition: rotate 0.2s var(--ease-out);
  }
  .tree :global(.chev.open) {
    rotate: 90deg;
  }
  .readonly {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-top: auto;
    padding: 12px;
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--success) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--success) 22%, transparent);
    color: var(--text-2);
    font-size: 12px;
    line-height: 1.45;
  }
  .readonly :global(svg) {
    flex: none;
    margin-top: 1px;
    color: var(--success);
  }
</style>
