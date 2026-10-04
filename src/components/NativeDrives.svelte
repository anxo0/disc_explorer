<script lang="ts">
  import { onMount } from 'svelte';
  import { Disc3, HardDrive, Usb, Network, FolderOpen, RefreshCw } from '@lucide/svelte';
  import { getNative, type NativeDrive } from '../lib/native';
  import { app } from '../lib/state.svelte';
  import { formatBytes, t } from '../lib/i18n/index.svelte';

  const api = getNative()!;
  let drives = $state<NativeDrive[]>([]);
  let loading = $state(true);

  const ICONS = { optical: Disc3, removable: Usb, network: Network, fixed: HardDrive, unknown: HardDrive };

  async function refresh() {
    try {
      const list = await api.listDrives();
      // Unidades ópticas primero: son el objetivo principal de la app.
      drives = list.sort((a, b) => Number(b.type === 'optical') - Number(a.type === 'optical') || a.root.localeCompare(b.root));
    } finally {
      loading = false;
    }
  }

  async function pickFolder() {
    const path = await api.pickFolder();
    if (path) app.openNative(path);
  }

  onMount(() => {
    refresh();
    // Detecta discos insertados/expulsados.
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  });
</script>

<div class="drives">
  <div class="head">
    <span class="eyebrow">{t('drives.title')}</span>
    <button class="icon-btn" onclick={refresh} aria-label={t('drives.refresh')}><RefreshCw size={15} /></button>
  </div>

  {#if loading}
    <div class="empty">{t('drives.loading')}</div>
  {:else if !drives.length}
    <div class="empty">{t('drives.none')}</div>
  {:else}
    <ul>
      {#each drives as d (d.root)}
        {@const Icon = ICONS[d.type]}
        <li>
          <button class="drive" class:optical={d.type === 'optical'} disabled={!d.ready} onclick={() => app.openNative(d.root)}>
            <span class="d-icon"><Icon size={18} /></span>
            <span class="d-main">
              <strong>{d.label || t(`drives.type.${d.type}`)}</strong>
              <span class="mono">{d.root} · {d.ready ? formatBytes(d.size) : t('drives.noDisc')}</span>
            </span>
            <span class="d-type">{t(`drives.type.${d.type}`)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <button class="btn btn-secondary" onclick={pickFolder}>
    <FolderOpen size={16} />
    {t('drives.folder')}
  </button>
</div>

<style>
  .drives {
    display: grid;
    gap: 10px;
    width: min(460px, 100%);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  ul {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .drive {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 14px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--border);
    text-align: left;
    transition: border-color 0.18s, background-color 0.18s, transform 0.18s var(--ease-out);
  }
  .drive:hover:not(:disabled) {
    border-color: var(--accent-ring);
    background: var(--surface-2);
    transform: translateY(-1px);
  }
  .drive:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .d-icon {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--surface-2);
    color: var(--text-2);
  }
  .optical .d-icon {
    color: var(--accent);
    background: var(--accent-soft);
  }
  .d-main {
    display: grid;
    flex: 1;
    min-width: 0;
  }
  .d-main strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 550;
  }
  .d-main span {
    color: var(--text-3);
    font-size: 12px;
  }
  .d-type {
    color: var(--text-3);
    font-size: 12px;
  }
  .empty {
    padding: 14px;
    border-radius: var(--radius);
    border: 1px dashed var(--border-strong);
    color: var(--text-3);
    font-size: 13px;
  }
  .btn {
    justify-self: start;
  }
</style>
