<script lang="ts">
  import { onMount } from 'svelte';
  import Disc3 from '@lucide/svelte/icons/disc-3';
  import HardDrive from '@lucide/svelte/icons/hard-drive';
  import Usb from '@lucide/svelte/icons/usb';
  import Network from '@lucide/svelte/icons/network';
  import FolderOpen from '@lucide/svelte/icons/folder-open';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import { getNative, type NativeDrive } from '$lib/native';
  import { app } from '$lib/state.svelte';
  import { formatBytes, t } from '$lib/i18n/index.svelte';
  import { cn } from '$lib/utils';

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
    const id = setInterval(refresh, 4000); // detecta discos insertados o expulsados
    return () => clearInterval(id);
  });
</script>

<div class="grid gap-2 text-left">
  <div class="flex items-center justify-between">
    <span class="text-xs font-medium text-muted-foreground">{t('drives.title')}</span>
    <Button variant="ghost" size="icon" class="size-7" onclick={refresh} aria-label={t('drives.refresh')}><RefreshCw class="size-3.5" /></Button>
  </div>
  {#if loading}
    <Skeleton class="h-14 w-full rounded-lg" />
  {:else if !drives.length}
    <p class="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">{t('drives.none')}</p>
  {:else}
    {#each drives as d (d.root)}
      {@const Icon = ICONS[d.type]}
      <button
        class="flex w-full items-center gap-3 rounded-lg border bg-background/50 p-3 text-left transition-all hover:-translate-y-px hover:border-primary/50 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        disabled={!d.ready}
        onclick={() => app.openNative(d.root)}
      >
        <span class={cn('grid size-9 place-items-center rounded-md bg-muted', d.type === 'optical' && 'bg-primary/12 text-primary')}><Icon class="size-4.5" /></span>
        <span class="grid min-w-0 flex-1">
          <strong class="truncate text-sm font-medium">{d.label || t(`drives.type.${d.type}`)}</strong>
          <span class="font-mono text-xs text-muted-foreground">{d.root} · {d.ready ? formatBytes(d.size) : t('drives.noDisc')}</span>
        </span>
        <span class="text-xs text-muted-foreground">{t(`drives.type.${d.type}`)}</span>
      </button>
    {/each}
  {/if}
  <Button variant="outline" class="justify-self-start" onclick={pickFolder}><FolderOpen />{t('drives.folder')}</Button>
</div>
