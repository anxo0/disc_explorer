<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import { Button } from '$lib/components/ui/button/index.js';
  import { app } from '$lib/state.svelte';
  import { getNative } from '$lib/native';
  import { tn, t } from '$lib/i18n/index.svelte';
  import DiscMark from '../shared/DiscMark.svelte';

  /** A partir de aquí avisamos de que la unidad va muy lenta o está bloqueada. */
  const SLOW_AFTER_MS = 12_000;
  const isDesktop = !!getNative();

  let now = $state(Date.now());
  onMount(() => {
    const id = setInterval(() => (now = Date.now()), 500);
    return () => clearInterval(id);
  });

  const elapsed = $derived(app.scanning ? Math.max(0, now - app.scanning.startedAt) : 0);
  const slow = $derived(elapsed > SLOW_AFTER_MS && (app.scanning?.count ?? 0) < 3);
</script>

<div class="fixed inset-0 z-[70] grid place-items-center bg-background/60 p-4 backdrop-blur-md" transition:fade={{ duration: 150 }} role="status" aria-live="polite">
  <div class="grid w-full max-w-sm justify-items-center gap-5 rounded-2xl border bg-card p-7 text-center shadow-2xl" transition:scale={{ start: 0.96, duration: 220 }}>
    <div class="relative">
      <DiscMark class="size-20" spin />
      <span class="absolute inset-0 animate-ping rounded-full bg-primary/10"></span>
    </div>
    <div class="grid w-full gap-1">
      <strong class="text-base font-semibold">{t('scan.title')}</strong>
      <span class="text-sm text-muted-foreground tabular">
        {app.scanning?.count ? tn('scan.files', app.scanning.count) : t('scan.waiting')} · {Math.floor(elapsed / 1000)} s
      </span>
      {#if app.scanning?.current}
        <code class="truncate font-mono text-[11px] text-muted-foreground">{app.scanning.current}</code>
      {/if}
    </div>

    {#if slow}
      <div class="flex gap-2.5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-left text-xs leading-relaxed text-muted-foreground" transition:fade>
        <TriangleAlert class="mt-0.5 size-4 shrink-0 text-warning" />
        <span>{isDesktop ? t('scan.slowDesktop') : t('scan.slow')}</span>
      </div>
    {:else}
      <p class="text-xs text-muted-foreground">{t('scan.hint')}</p>
    {/if}

    <Button variant={slow ? 'default' : 'outline'} size="sm" onclick={() => app.cancelScan()}>{t('action.cancel')}</Button>
  </div>
</div>
