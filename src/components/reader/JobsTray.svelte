<script lang="ts">
  import { fly, slide } from 'svelte/transition';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import X from '@lucide/svelte/icons/x';
  import Download from '@lucide/svelte/icons/download';
  import FolderOpen from '@lucide/svelte/icons/folder-open';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import Ban from '@lucide/svelte/icons/ban';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Progress } from '$lib/components/ui/progress/index.js';
  import { jobs, type Job } from '$lib/convert/jobs.svelte';
  import { downloadUrl } from '$lib/download';
  import { getNative } from '$lib/native';
  import { formatDuration } from '$lib/format';
  import { formatBytes, t, tn } from '$lib/i18n/index.svelte';

  let open = $state(true);
  let lastCount = 0;

  // Se despliega automáticamente al añadir una exportación.
  $effect(() => {
    if (jobs.list.length > lastCount) open = true;
    lastCount = jobs.list.length;
  });

  const active = $derived(jobs.active.length);
  const running = (j: Job) => j.status === 'queued' || j.status === 'loading' || j.status === 'running';

  function statusText(job: Job): string {
    switch (job.status) {
      case 'queued':
        return t('job.queued');
      case 'loading':
        return t('job.loading');
      case 'running': {
        const pct = job.ratio !== undefined ? `${Math.round(job.ratio * 100)} %` : formatDuration(job.time);
        return job.speed ? `${pct} · ${job.speed.toFixed(1)}×` : pct;
      }
      case 'done':
        return job.output?.kind === 'blob' ? `${t('job.done')} · ${formatBytes(job.output.size)}` : t('job.saved');
      case 'canceled':
        return t('job.canceled');
      case 'error':
        return t('job.error');
    }
  }
</script>

{#if jobs.list.length}
  <div
    class="fixed right-4 bottom-[calc(1rem+var(--player-h,0px))] z-[60] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl"
    transition:fly={{ y: 20, duration: 250 }}
  >
    <button class="flex h-11 w-full items-center gap-2.5 px-4 text-left text-sm font-medium" onclick={() => (open = !open)} aria-expanded={open}>
      {#if active}
        <LoaderCircle class="size-4 animate-spin text-primary" /><span class="flex-1">{tn('job.active', active)}</span>
      {:else}
        <CircleCheck class="size-4 text-success" /><span class="flex-1">{t('job.allDone')}</span>
      {/if}
      <ChevronDown class="size-4 text-muted-foreground transition-transform {open ? '' : 'rotate-180'}" />
    </button>

    {#if open}
      <ul class="max-h-80 overflow-y-auto border-t px-2 pb-2" transition:slide={{ duration: 200 }}>
        {#each jobs.list as job (job.id)}
          <li class="border-b px-2 py-2.5 last:border-b-0">
            <div class="flex items-center gap-2">
              <div class="grid min-w-0 flex-1">
                <strong class="truncate text-[13px] font-medium" title={job.title}>{job.title}</strong>
                <span class="flex items-center gap-2 text-xs text-muted-foreground tabular">
                  <span class="rounded border bg-muted px-1.5 font-mono text-[10.5px]">{job.format}</span>
                  {statusText(job)}
                </span>
              </div>
              {#if job.status === 'done' && job.output?.kind === 'blob'}
                {@const out = job.output}
                <Button variant="ghost" size="icon" class="size-7" onclick={() => downloadUrl(out.url, out.filename)} aria-label={t('job.download')}><Download /></Button>
              {:else if job.status === 'done' && job.output?.kind === 'file'}
                {@const out = job.output}
                <Button variant="ghost" size="icon" class="size-7" onclick={() => getNative()?.showInFolder(out.path)} aria-label={t('job.showInFolder')}><FolderOpen /></Button>
              {/if}
              {#if job.status === 'error'}<CircleAlert class="size-4 text-destructive" />{/if}
              {#if job.status === 'canceled'}<Ban class="size-4 text-muted-foreground" />{/if}
              <Button
                variant="ghost"
                size="icon"
                class="size-7"
                onclick={() => (running(job) ? jobs.cancel(job.id) : jobs.dismiss(job.id))}
                aria-label={running(job) ? t('action.cancel') : t('job.dismiss')}
              >
                <X />
              </Button>
            </div>
            {#if running(job)}
              <Progress value={job.ratio !== undefined ? job.ratio * 100 : null} class="mt-2 h-1" />
            {/if}
            {#if job.error}
              <p class="mt-1.5 max-h-16 overflow-auto font-mono text-[11px] whitespace-pre-wrap text-destructive">{job.error}</p>
            {/if}
          </li>
        {/each}
      </ul>
      {#if jobs.list.length > active}
        <button class="h-9 w-full border-t text-xs text-muted-foreground hover:bg-accent hover:text-foreground" onclick={() => jobs.clearFinished()}>
          {t('job.clear')}
        </button>
      {/if}
    {/if}
  </div>
{/if}
