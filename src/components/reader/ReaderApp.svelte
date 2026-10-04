<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { toast } from 'svelte-sonner';
  import FolderDown from '@lucide/svelte/icons/folder-down';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import { Toaster } from '$lib/components/ui/sonner/index.js';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import { app } from '$lib/state.svelte';
  import { i18n, t } from '$lib/i18n/index.svelte';
  import AppSidebar from './AppSidebar.svelte';
  import ReaderHeader from './ReaderHeader.svelte';
  import EmptyState from './EmptyState.svelte';
  import Browser from './Browser.svelte';
  import Inspector from './Inspector.svelte';
  import PlayerBar from './PlayerBar.svelte';
  import JobsTray from './JobsTray.svelte';
  import ScanDialog from './ScanDialog.svelte';

  let { desktopUrl }: { desktopUrl: string } = $props();
  let dragDepth = $state(0);

  onMount(() => {
    document.documentElement.lang = i18n.lang;
  });

  $effect(() => {
    document.title = app.source ? `${app.source.label} · DiscLens` : `${t('reader.title')} · DiscLens`;
  });

  // Los errores se muestran como toasts de Sonner.
  $effect(() => {
    if (!app.error) return;
    toast.error(app.error);
    app.error = null;
  });

  const hasFiles = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files');
</script>

<svelte:window
  ondragenter={(e) => hasFiles(e) && (e.preventDefault(), dragDepth++)}
  ondragover={(e) => hasFiles(e) && e.preventDefault()}
  ondragleave={(e) => hasFiles(e) && (dragDepth = Math.max(0, dragDepth - 1))}
  ondrop={(e) => {
    if (!hasFiles(e) || !e.dataTransfer) return;
    e.preventDefault();
    dragDepth = 0;
    app.openDrop(e.dataTransfer);
  }}
/>

<Tooltip.Provider delayDuration={300}>
  <Sidebar.Provider>
    <AppSidebar />
    <Sidebar.Inset class="h-svh min-w-0 overflow-hidden">
      <ReaderHeader {desktopUrl} />
      <div class="flex min-h-0 flex-1">
        <main class="min-w-0 flex-1 overflow-y-auto">
          {#if app.source}
            <Browser />
          {:else}
            <EmptyState {desktopUrl} />
          {/if}
        </main>
        {#if app.selected}
          <Inspector item={app.selected} />
        {/if}
      </div>
      <PlayerBar />
    </Sidebar.Inset>
  </Sidebar.Provider>
</Tooltip.Provider>

{#if app.scanning}
  <ScanDialog />
{/if}
<JobsTray />
<Toaster position="bottom-center" richColors />

{#if dragDepth > 0}
  <div class="pointer-events-none fixed inset-0 z-[90] grid place-items-center bg-background/70 p-6 backdrop-blur-md" transition:fade={{ duration: 150 }}>
    <div class="grid w-full max-w-md justify-items-center gap-2 rounded-2xl border-2 border-dashed border-primary bg-primary/10 px-8 py-12 text-center text-primary">
      <FolderDown class="size-9" strokeWidth={1.5} />
      <strong class="text-lg font-semibold text-foreground">{t('drop.title')}</strong>
      <span class="text-muted-foreground">{t('drop.body')}</span>
    </div>
  </div>
{/if}
