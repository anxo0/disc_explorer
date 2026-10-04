<script lang="ts">
  import { Search, Moon, Sun, X, Download, Disc3 } from '@lucide/svelte';
  import { app } from '../lib/state.svelte';
  import { theme } from '../lib/theme.svelte';
  import { i18n, LANGS, t } from '../lib/i18n/index.svelte';
  import { getNative } from '../lib/native';
  import Logo from './Logo.svelte';

  let { desktopUrl }: { desktopUrl: string } = $props();
  const isDesktop = !!getNative();
  let search: HTMLInputElement | undefined = $state();

  function onKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    if (app.source && !typing && (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'))) {
      e.preventDefault();
      search?.focus();
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<header class="topbar">
  <button class="brand" onclick={() => app.close()} aria-label={t('nav.home')} disabled={!app.source}>
    <Logo />
  </button>

  {#if app.source}
    <div class="disc-chip" title={app.source.root}>
      <Disc3 size={14} />
      <span class="name">{app.source.label}</span>
      <button class="close" onclick={() => app.close()} aria-label={t('action.closeDisc')}><X size={13} /></button>
    </div>

    <label class="search">
      <Search size={15} />
      <input
        bind:this={search}
        bind:value={app.query}
        type="search"
        placeholder={t('search.placeholder')}
        spellcheck="false"
        autocomplete="off"
      />
      <kbd class="mono">/</kbd>
    </label>
  {:else}
    <div class="spacer"></div>
  {/if}

  <div class="actions">
    <div class="lang" role="group" aria-label={t('nav.language')}>
      {#each LANGS as lang (lang)}
        <button class:on={i18n.lang === lang} onclick={() => i18n.set(lang)} aria-pressed={i18n.lang === lang}>
          {lang.toUpperCase()}
        </button>
      {/each}
    </div>
    <button
      class="icon-btn"
      onclick={() => theme.toggle()}
      aria-label={theme.current === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
      title={theme.current === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
    >
      {#if theme.current === 'dark'}<Sun size={17} />{:else}<Moon size={17} />{/if}
    </button>
    {#if !isDesktop}
      <a class="btn btn-secondary btn-sm desktop" href={desktopUrl} target="_blank" rel="noopener">
        <Download size={14} />
        <span>{t('nav.desktop')}</span>
      </a>
    {/if}
  </div>
</header>

<style>
  .topbar {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 16px;
    height: var(--topbar-h);
    padding: 0 20px;
    background: color-mix(in srgb, var(--bg) 82%, transparent);
    backdrop-filter: saturate(1.4) blur(14px);
    border-bottom: 1px solid var(--border);
  }
  .brand {
    display: flex;
    flex: none;
  }
  .brand:disabled {
    cursor: default;
  }
  .spacer {
    flex: 1;
  }
  .disc-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    max-width: 240px;
    height: 30px;
    padding: 0 6px 0 10px;
    border-radius: 999px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text-2);
    font-size: 13px;
  }
  .disc-chip .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
    font-weight: 500;
  }
  .disc-chip .close {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    color: var(--text-3);
  }
  .disc-chip .close:hover {
    background: var(--active);
    color: var(--text);
  }
  .search {
    flex: 1;
    max-width: 520px;
    display: flex;
    align-items: center;
    gap: 9px;
    height: 36px;
    padding: 0 10px 0 12px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-3);
    transition: border-color 0.18s, box-shadow 0.18s;
  }
  .search:focus-within {
    border-color: var(--accent-ring);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: 13.5px;
  }
  .search input::placeholder {
    color: var(--text-3);
  }
  kbd {
    display: grid;
    place-items: center;
    min-width: 20px;
    height: 20px;
    border-radius: 5px;
    border: 1px solid var(--border-strong);
    font-size: 11px;
    color: var(--text-3);
  }
  .actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .lang {
    display: flex;
    padding: 3px;
    border-radius: 9px;
    background: var(--surface-2);
    border: 1px solid var(--border);
  }
  .lang button {
    height: 24px;
    padding: 0 8px;
    border-radius: 6px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    color: var(--text-3);
    transition: background-color 0.18s, color 0.18s;
  }
  .lang button.on {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }
  :global([data-theme='dark']) .lang button.on {
    background: var(--surface-3);
  }
  @media (max-width: 760px) {
    .topbar {
      padding: 0 16px;
      gap: 10px;
    }
    .disc-chip,
    .desktop span,
    kbd {
      display: none;
    }
    .brand :global(.word) {
      display: none;
    }
  }
  @media (max-width: 480px) {
    .desktop {
      display: none;
    }
  }
</style>
