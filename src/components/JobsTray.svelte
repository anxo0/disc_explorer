<script lang="ts">
  import { fly, slide } from 'svelte/transition';
  import { ChevronDown, X, Download, FolderOpen, CircleCheck, CircleAlert, Ban, LoaderCircle } from '@lucide/svelte';
  import { jobs, type Job } from '../lib/convert/jobs.svelte';
  import { downloadUrl } from '../lib/download';
  import { getNative } from '../lib/native';
  import { formatDuration } from '../lib/format';
  import { formatBytes, t, tn } from '../lib/i18n/index.svelte';

  let open = $state(true);
  let lastCount = 0;

  // Se despliega automáticamente cuando se añade una exportación nueva.
  $effect(() => {
    if (jobs.list.length > lastCount) open = true;
    lastCount = jobs.list.length;
  });

  const active = $derived(jobs.active.length);

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
  <div class="tray" transition:fly={{ y: 20, duration: 250 }}>
    <button class="head" onclick={() => (open = !open)} aria-expanded={open}>
      {#if active}
        <LoaderCircle size={15} class="spin" />
        <span>{tn('job.active', active)}</span>
      {:else}
        <CircleCheck size={15} class="ok" />
        <span>{t('job.allDone')}</span>
      {/if}
      <ChevronDown size={16} class={open ? 'chev' : 'chev closed'} />
    </button>

    {#if open}
      <ul transition:slide={{ duration: 200 }}>
        {#each jobs.list as job (job.id)}
          <li class="job status-{job.status}">
            <div class="row">
              <div class="info">
                <strong title={job.title}>{job.title}</strong>
                <span>
                  <b class="fmt mono">{job.format}</b>
                  {statusText(job)}
                </span>
              </div>
              <div class="acts">
                {#if job.status === 'done' && job.output?.kind === 'blob'}
                  {@const out = job.output}
                  <button class="icon-btn" onclick={() => downloadUrl(out.url, out.filename)} aria-label={t('job.download')}><Download size={15} /></button>
                {:else if job.status === 'done' && job.output?.kind === 'file'}
                  {@const out = job.output}
                  <button class="icon-btn" onclick={() => getNative()?.showInFolder(out.path)} aria-label={t('job.showInFolder')}><FolderOpen size={15} /></button>
                {/if}
                {#if job.status === 'error'}<CircleAlert size={15} class="err" />{/if}
                {#if job.status === 'canceled'}<Ban size={15} class="muted" />{/if}
                {#if ['queued', 'loading', 'running'].includes(job.status)}
                  <button class="icon-btn" onclick={() => jobs.cancel(job.id)} aria-label={t('action.cancel')}><X size={15} /></button>
                {:else}
                  <button class="icon-btn" onclick={() => jobs.dismiss(job.id)} aria-label={t('job.dismiss')}><X size={15} /></button>
                {/if}
              </div>
            </div>
            {#if ['queued', 'loading', 'running'].includes(job.status)}
              <div class="bar"><span class:indeterminate={job.ratio === undefined} style:width="{Math.round((job.ratio ?? 0) * 100)}%"></span></div>
            {/if}
            {#if job.error}<p class="error mono">{job.error}</p>{/if}
          </li>
        {/each}
      </ul>
      {#if jobs.list.length > active}
        <button class="clear" onclick={() => jobs.clearFinished()}>{t('job.clear')}</button>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .tray {
    position: fixed;
    right: 20px;
    bottom: calc(20px + var(--player-h));
    z-index: 60;
    width: min(380px, calc(100vw - 32px));
    border-radius: var(--radius-lg);
    background: var(--surface);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    height: 46px;
    padding: 0 14px;
    font-size: 13.5px;
    font-weight: 550;
    text-align: left;
  }
  .head span {
    flex: 1;
  }
  .head :global(.chev) {
    color: var(--text-3);
    transition: rotate 0.2s;
  }
  .head :global(.chev.closed) {
    rotate: 180deg;
  }
  .tray :global(.spin) {
    color: var(--accent);
    animation: spin 0.9s linear infinite;
  }
  .tray :global(.ok) {
    color: var(--success);
  }
  .tray :global(.err) {
    color: var(--danger);
  }
  .tray :global(.muted) {
    color: var(--text-3);
  }
  @keyframes spin {
    to {
      rotate: 360deg;
    }
  }
  ul {
    max-height: 320px;
    margin: 0;
    padding: 0 6px 6px;
    overflow-y: auto;
    list-style: none;
    border-top: 1px solid var(--border);
  }
  .job {
    padding: 10px 8px;
    border-bottom: 1px solid var(--border);
  }
  .job:last-child {
    border-bottom: 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .info {
    display: grid;
    flex: 1;
    min-width: 0;
  }
  .info strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 550;
  }
  .info span {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-3);
    font-size: 12px;
  }
  .fmt {
    padding: 1px 6px;
    border-radius: 5px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text-2);
    font-size: 10.5px;
    font-weight: 500;
  }
  .acts {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .acts .icon-btn {
    width: 28px;
    height: 28px;
  }
  .bar {
    height: 3px;
    margin-top: 8px;
    border-radius: 99px;
    background: var(--surface-3);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--accent);
    transition: width 0.4s var(--ease-out);
  }
  .bar .indeterminate {
    width: 35% !important;
    animation: slide 1.2s ease-in-out infinite;
  }
  @keyframes slide {
    from {
      translate: -100% 0;
    }
    to {
      translate: 300% 0;
    }
  }
  .error {
    margin-top: 6px;
    max-height: 70px;
    overflow: auto;
    white-space: pre-wrap;
    color: var(--danger);
    font-size: 11px;
  }
  .clear {
    width: 100%;
    height: 36px;
    border-top: 1px solid var(--border);
    color: var(--text-3);
    font-size: 12px;
  }
  .clear:hover {
    color: var(--text);
    background: var(--hover);
  }
</style>
