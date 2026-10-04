<script lang="ts">
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';
  import FolderOpen from '@lucide/svelte/icons/folder-open';
  import Info from '@lucide/svelte/icons/info';
  import Lock from '@lucide/svelte/icons/lock';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import MonitorDown from '@lucide/svelte/icons/monitor-down';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { app } from '$lib/state.svelte';
  import { t } from '$lib/i18n/index.svelte';
  import { supportsDirectoryPicker } from '$lib/sources/web';
  import { getNative } from '$lib/native';
  import NativeDrives from './NativeDrives.svelte';

  let { desktopUrl }: { desktopUrl: string } = $props();
  const isDesktop = !!getNative();
  const pickerSupported = supportsDirectoryPicker();
  let fileInput: HTMLInputElement;
  let root: HTMLElement;

  function open() {
    if (pickerSupported) app.openPicker();
    else fileInput.click();
  }

  function onFiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files?.length) app.openFileList(input.files);
    input.value = '';
  }

  const formats = ['DVD-Video', 'CD Audio', 'Blu-ray', 'AVCHD', 'VCD', 'SVCD', 'DVD-VR', 'Data'];

  onMount(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-in]', { y: 16, opacity: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out' });
      gsap.to('.drop-disc', { rotation: 360, duration: 18, ease: 'none', repeat: -1 });
    }, root);
    return () => ctx.revert();
  });
</script>

<input bind:this={fileInput} type="file" webkitdirectory multiple hidden onchange={onFiles} />

<div class="mx-auto grid min-h-full max-w-3xl content-center gap-6 p-6 md:p-10" bind:this={root}>
  <Card.Root class="relative overflow-hidden" data-in>
    <div class="pointer-events-none absolute -top-32 -right-32 size-80 rounded-full bg-primary/15 blur-3xl"></div>
    <Card.Content class="grid gap-8 p-8 md:grid-cols-[auto_1fr] md:items-center md:p-10">
      <div class="drop-disc iridescent relative mx-auto size-36 rounded-full shadow-2xl md:size-44">
        <span class="absolute inset-0 rounded-full bg-[repeating-radial-gradient(circle,rgb(255_255_255/0.08)_0_1px,transparent_1px_3px)] mix-blend-overlay"></span>
        <span class="absolute inset-[33%] rounded-full bg-white/20 ring-1 ring-white/30 backdrop-blur"></span>
        <span class="absolute inset-[44%] rounded-full bg-card"></span>
      </div>
      <div class="grid gap-4 text-center md:text-left">
        <div class="grid gap-2">
          <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">{t('empty.title')}</h1>
          <p class="text-muted-foreground">{t('empty.body')}</p>
        </div>
        {#if isDesktop}
          <NativeDrives />
        {:else}
          <div class="flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <Button size="lg" onclick={open}><FolderOpen />{t('hero.open')}</Button>
            <span class="text-sm text-muted-foreground">{t('hero.dragHint')}</span>
          </div>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>

  {#if !isDesktop && !pickerSupported}
    <div class="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-muted-foreground" data-in>
      <Info class="mt-0.5 size-4 shrink-0 text-warning" />
      <span>{t('hero.fallback')}</span>
    </div>
  {/if}

  <div class="grid gap-3 sm:grid-cols-3" data-in>
    <div class="flex items-start gap-3 rounded-lg border bg-card/50 p-4">
      <Lock class="mt-0.5 size-4 shrink-0 text-primary" />
      <p class="text-sm text-muted-foreground">{t('hero.trust.local')}</p>
    </div>
    <div class="flex items-start gap-3 rounded-lg border bg-card/50 p-4">
      <ShieldCheck class="mt-0.5 size-4 shrink-0 text-success" />
      <p class="text-sm text-muted-foreground">{t('hero.trust.readonly')}</p>
    </div>
    {#if isDesktop}
      <div class="flex items-start gap-3 rounded-lg border bg-card/50 p-4">
        <MonitorDown class="mt-0.5 size-4 shrink-0 text-image" />
        <p class="text-sm text-muted-foreground">{t('export.engine.native')}</p>
      </div>
    {:else}
      <a href={desktopUrl} target="_blank" rel="noopener" class="flex items-start gap-3 rounded-lg border bg-card/50 p-4 transition-colors hover:bg-accent">
        <MonitorDown class="mt-0.5 size-4 shrink-0 text-image" />
        <p class="text-sm text-muted-foreground">{t('empty.slowHint')}</p>
      </a>
    {/if}
  </div>

  <div class="flex flex-wrap justify-center gap-1.5" data-in>
    {#each formats as f (f)}
      <Badge variant="secondary" class="font-mono text-[11px]">{f}</Badge>
    {/each}
  </div>
</div>
