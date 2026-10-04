<script lang="ts">
  import { tick } from 'svelte';
  import { gsap } from 'gsap';
  import { List, LayoutGrid, Folder, ChevronRight, Play, ArrowUpDown, SearchX, Clock } from '@lucide/svelte';
  import type { DiscFile, MediaItem } from '../lib/types';
  import { app } from '../lib/state.svelte';
  import { itemForFile } from '../lib/analyze';
  import { browserCanShow } from '../lib/detect';
  import { formatDuration } from '../lib/format';
  import { formatBytes, formatDate, kindLabel, tn, t } from '../lib/i18n/index.svelte';
  import FileIcon from './FileIcon.svelte';
  import Thumb from './Thumb.svelte';

  type SortKey = 'name' | 'size' | 'kind';
  let sortKey = $state<SortKey>('name');
  let sortDir = $state<1 | -1>(1);
  let limit = $state(400);
  let content: HTMLDivElement;

  const source = $derived(app.source!);
  const analysis = $derived(app.analysis!);
  const showFeatured = $derived(!app.flatMode && app.dir === '' && analysis.featured.length > 0);
  const crumbs = $derived(app.dir ? app.dir.split('/') : []);

  const sorted = $derived.by(() => {
    const files = [...app.visible];
    const cmp: Record<SortKey, (a: DiscFile, b: DiscFile) => number> = {
      name: (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
      size: (a, b) => a.size - b.size,
      kind: (a, b) => a.category.localeCompare(b.category) || a.kind.localeCompare(b.kind),
    };
    return files.sort((a, b) => cmp[sortKey](a, b) * sortDir);
  });

  function sortBy(key: SortKey) {
    if (sortKey === key) sortDir = sortDir === 1 ? -1 : 1;
    else {
      sortKey = key;
      sortDir = key === 'size' ? -1 : 1;
    }
  }

  function goTo(index: number) {
    app.dir = crumbs.slice(0, index + 1).join('/');
  }

  function activate(file: DiscFile) {
    app.selectFile(file);
  }

  function play(e: MouseEvent, item: MediaItem) {
    e.stopPropagation();
    app.select(item);
    if (item.category === 'audio') app.playAudio(item);
  }

  const canQuickPlay = (f: DiscFile) => f.category === 'audio' && browserCanShow(f.kind);
  const isSelected = (f: DiscFile) => app.selected?.files.includes(f) ?? false;

  // Animación escalonada al cambiar de carpeta, filtro o vista.
  $effect(() => {
    void [app.dir, app.filter, app.view, app.query.trim() === ''];
    limit = 400;
    tick().then(() => {
      if (!content || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const rows = content.querySelectorAll('[data-anim]');
      gsap.fromTo(
        [...rows].slice(0, 36),
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.018, ease: 'power2.out', clearProps: 'all' },
      );
    });
  });
</script>

<section class="browser">
  <header class="toolbar">
    {#if app.flatMode}
      <div class="crumbs">
        <span class="crumb current">
          {app.query.trim() ? t('browser.results', { q: app.query.trim() }) : t(`cat.${app.filter}`)}
        </span>
        <span class="chip mono">{sorted.length}</span>
      </div>
    {:else}
      <nav class="crumbs" aria-label={t('browser.path')}>
        <button class="crumb" class:current={!crumbs.length} onclick={() => (app.dir = '')}>{source.label}</button>
        {#each crumbs as c, i (i)}
          <ChevronRight size={14} class="sep" />
          <button class="crumb mono" class:current={i === crumbs.length - 1} onclick={() => goTo(i)}>{c}</button>
        {/each}
      </nav>
    {/if}

    <div class="view-toggle" role="group" aria-label={t('browser.view')}>
      <button class:on={app.view === 'list'} onclick={() => (app.view = 'list')} aria-label={t('browser.list')} aria-pressed={app.view === 'list'}>
        <List size={16} />
      </button>
      <button class:on={app.view === 'grid'} onclick={() => (app.view = 'grid')} aria-label={t('browser.grid')} aria-pressed={app.view === 'grid'}>
        <LayoutGrid size={16} />
      </button>
    </div>
  </header>

  <div class="content" bind:this={content}>
    {#if showFeatured}
      <section class="featured">
        <h3 class="eyebrow">{t(analysis.featuredLabel)}</h3>
        <div class="featured-grid">
          {#each analysis.featured as item (item.id)}
            <div
              class="feat"
              class:on={app.selected?.id === item.id}
              data-anim
              role="button"
              tabindex="0"
              onclick={() => app.select(item)}
              onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), app.select(item))}
            >
              <FileIcon category={item.category} size={40} />
              <div class="feat-text">
                <strong>{item.title()}</strong>
                <span>{item.subtitle?.()}</span>
              </div>
              <div class="feat-meta mono">
                {#if item.duration}<span><Clock size={12} /> {formatDuration(item.duration)}</span>{/if}
                <span>{formatBytes(item.files.reduce((s, f) => s + f.size, 0))}</span>
              </div>
              {#if !item.unsupported}
                <button class="play" onclick={(e) => play(e, item)} aria-label={t('action.play')}><Play size={14} /></button>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if !sorted.length && !app.subdirs.length}
      <div class="empty">
        <SearchX size={28} strokeWidth={1.5} />
        <strong>{t('browser.empty.title')}</strong>
        <span>{app.flatMode ? t('browser.empty.search') : t('browser.empty.folder')}</span>
      </div>
    {:else if app.view === 'list'}
      <div class="table" role="table">
        <div class="thead" role="row">
          <button class="th name" onclick={() => sortBy('name')} role="columnheader">
            {t('col.name')} {#if sortKey === 'name'}<ArrowUpDown size={12} />{/if}
          </button>
          <button class="th kind" onclick={() => sortBy('kind')} role="columnheader">
            {t('col.kind')} {#if sortKey === 'kind'}<ArrowUpDown size={12} />{/if}
          </button>
          <button class="th size" onclick={() => sortBy('size')} role="columnheader">
            {t('col.size')} {#if sortKey === 'size'}<ArrowUpDown size={12} />{/if}
          </button>
          <span class="th date" role="columnheader">{t('col.modified')}</span>
        </div>

        {#each app.subdirs as d (d)}
          <button class="row" data-anim onclick={() => (app.dir = d)} role="row">
            <span class="cell name">
              <span class="folder-icon"><Folder size={17} /></span>
              <span class="file-name">{d.split('/').pop()}</span>
            </span>
            <span class="cell kind">{t('kind.folder')}</span>
            <span class="cell size mono">{tn('count.items', source.files.filter((f) => f.dir === d || f.dir.startsWith(`${d}/`)).length)}</span>
            <span class="cell date"></span>
          </button>
        {/each}

        {#each sorted.slice(0, limit) as file (file.path)}
          <div
            class="row"
            class:on={isSelected(file)}
            data-anim
            role="row"
            tabindex="0"
            onclick={() => activate(file)}
            ondblclick={() => canQuickPlay(file) && app.playAudio(itemForFile(file))}
            onkeydown={(e) => e.key === 'Enter' && activate(file)}
          >
            <span class="cell name">
              <FileIcon category={file.category} size={30} />
              <span class="name-stack">
                <span class="file-name">{file.name}</span>
                {#if app.flatMode && file.dir}<span class="file-dir mono">/{file.dir}</span>{/if}
              </span>
              {#if canQuickPlay(file)}
                <button class="play inline" onclick={(e) => play(e, itemForFile(file))} aria-label={t('action.play')}><Play size={12} /></button>
              {/if}
            </span>
            <span class="cell kind">{kindLabel(file.kind)}</span>
            <span class="cell size mono">{formatBytes(file.size)}</span>
            <span class="cell date">{formatDate(file.lastModified)}</span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="grid">
        {#each app.subdirs as d (d)}
          <button class="tile" data-anim onclick={() => (app.dir = d)}>
            <span class="tile-art folder"><Folder size={38} strokeWidth={1.4} /></span>
            <span class="tile-name">{d.split('/').pop()}</span>
          </button>
        {/each}
        {#each sorted.slice(0, limit) as file (file.path)}
          <button class="tile" class:on={isSelected(file)} data-anim onclick={() => activate(file)}>
            <span class="tile-art">
              {#if file.category === 'image' && browserCanShow(file.kind)}
                <Thumb {file} />
              {:else}
                <FileIcon category={file.category} size={48} />
              {/if}
            </span>
            <span class="tile-name" title={file.name}>{file.name}</span>
            <span class="tile-meta mono">{formatBytes(file.size)}</span>
          </button>
        {/each}
      </div>
    {/if}

    {#if sorted.length > limit}
      <button class="btn btn-secondary more" onclick={() => (limit += 400)}>
        {t('browser.more', { n: sorted.length - limit })}
      </button>
    {/if}
  </div>
</section>

<style>
  .browser {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    height: 52px;
    padding: 0 20px;
    border-bottom: 1px solid var(--border);
  }
  .crumbs {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    overflow: hidden;
  }
  .crumb {
    padding: 4px 6px;
    border-radius: 6px;
    color: var(--text-3);
    font-size: 13.5px;
    white-space: nowrap;
  }
  .crumb:hover {
    color: var(--text);
    background: var(--hover);
  }
  .crumb.current {
    color: var(--text);
    font-weight: 550;
  }
  .crumbs :global(.sep) {
    flex: none;
    color: var(--text-3);
  }
  .view-toggle {
    display: flex;
    padding: 3px;
    border-radius: 9px;
    background: var(--surface-2);
    border: 1px solid var(--border);
  }
  .view-toggle button {
    display: grid;
    place-items: center;
    width: 30px;
    height: 26px;
    border-radius: 6px;
    color: var(--text-3);
  }
  .view-toggle button.on {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }
  :global([data-theme='dark']) .view-toggle button.on {
    background: var(--surface-3);
  }
  .content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 20px;
  }

  /* destacados */
  .featured {
    margin-bottom: 26px;
  }
  .featured .eyebrow {
    margin-bottom: 12px;
  }
  .featured-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
  }
  .feat {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 12px;
    padding: 14px;
    border-radius: var(--radius-lg);
    background: var(--surface);
    border: 1px solid var(--border);
    text-align: left;
    cursor: pointer;
    transition: border-color 0.18s, transform 0.25s var(--ease-out), box-shadow 0.25s;
  }
  .feat:hover {
    border-color: var(--border-strong);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  .feat.on {
    border-color: var(--accent-ring);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .feat-text {
    display: grid;
    min-width: 0;
    padding-right: 30px;
  }
  .feat-text strong {
    font-weight: 600;
  }
  .feat-text span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-3);
    font-size: 12px;
  }
  .feat-meta {
    grid-column: 1 / -1;
    display: flex;
    gap: 14px;
    color: var(--text-2);
    font-size: 11.5px;
  }
  .feat-meta span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .play {
    position: absolute;
    top: 14px;
    right: 14px;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-ink);
    opacity: 0;
    scale: 0.85;
    transition: opacity 0.18s, scale 0.18s var(--ease-out);
  }
  .feat:hover .play,
  .feat.on .play,
  .feat:focus-visible .play {
    opacity: 1;
    scale: 1;
  }
  .play :global(svg) {
    margin-left: 2px;
    fill: currentColor;
  }

  /* tabla */
  .table {
    display: grid;
  }
  .thead,
  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 190px 96px 150px;
    align-items: center;
    gap: 12px;
    padding: 0 10px;
  }
  .thead {
    height: 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 4px;
  }
  .th {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--text-3);
    font-size: 11.5px;
    font-weight: 500;
    text-align: left;
  }
  .th.size {
    justify-content: flex-end;
  }
  .row {
    min-height: 46px;
    border-radius: 9px;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.12s;
  }
  .row:hover {
    background: var(--hover);
  }
  .row.on {
    background: var(--accent-soft);
  }
  .cell {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-2);
    font-size: 12.5px;
  }
  .cell.name {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--text);
    font-size: 13.5px;
  }
  .cell.size {
    text-align: right;
    font-size: 12px;
  }
  .name-stack {
    display: grid;
    min-width: 0;
  }
  .file-name {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .file-dir {
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-3);
    font-size: 11px;
  }
  .folder-icon {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    flex: none;
    color: var(--text-2);
  }
  .play.inline {
    position: static;
    flex: none;
    width: 24px;
    height: 24px;
    margin-left: auto;
  }
  .row:hover .play.inline,
  .row.on .play.inline {
    opacity: 1;
    scale: 1;
  }

  /* cuadrícula */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
  .tile {
    display: grid;
    gap: 8px;
    padding: 8px 8px 10px;
    border-radius: var(--radius-lg);
    border: 1px solid transparent;
    text-align: left;
    transition: background-color 0.15s, border-color 0.15s;
  }
  .tile:hover {
    background: var(--hover);
  }
  .tile.on {
    background: var(--accent-soft);
    border-color: var(--accent-ring);
  }
  .tile-art {
    display: grid;
    place-items: center;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: 10px;
    background: var(--surface);
    border: 1px solid var(--border);
  }
  .tile-art.folder {
    color: var(--text-3);
  }
  .tile-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 2px;
    font-size: 12.5px;
  }
  .tile-meta {
    margin-top: -6px;
    padding: 0 2px;
    color: var(--text-3);
    font-size: 11px;
  }

  .empty {
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: 64px 16px;
    color: var(--text-3);
    text-align: center;
  }
  .empty strong {
    color: var(--text);
    font-weight: 550;
  }
  .more {
    display: flex;
    margin: 20px auto 0;
  }

  @media (max-width: 1280px) {
    .thead,
    .row {
      grid-template-columns: minmax(0, 1fr) 150px 90px;
    }
    .date {
      display: none;
    }
  }
  @media (max-width: 640px) {
    .toolbar,
    .content {
      padding-left: 16px;
      padding-right: 16px;
    }
    .thead,
    .row {
      grid-template-columns: minmax(0, 1fr) 80px;
    }
    .kind {
      display: none;
    }
  }
</style>
