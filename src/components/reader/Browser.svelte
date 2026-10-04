<script lang="ts">
  import { tick } from 'svelte';
  import { gsap } from 'gsap';
  import Folder from '@lucide/svelte/icons/folder';
  import Play from '@lucide/svelte/icons/play';
  import Clock from '@lucide/svelte/icons/clock';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import SearchX from '@lucide/svelte/icons/search-x';
  import * as Table from '$lib/components/ui/table/index.js';
  import * as Empty from '$lib/components/ui/empty/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import type { DiscFile, MediaItem } from '$lib/types';
  import { app } from '$lib/state.svelte';
  import { itemForFile } from '$lib/analyze';
  import { browserCanShow } from '$lib/detect';
  import { formatDuration } from '$lib/format';
  import { formatBytes, formatDate, kindLabel, tn, t } from '$lib/i18n/index.svelte';
  import { cn } from '$lib/utils';
  import FileIcon from '../shared/FileIcon.svelte';
  import Thumb from '../shared/Thumb.svelte';

  type SortKey = 'name' | 'size' | 'kind';
  let sortKey = $state<SortKey>('name');
  let sortDir = $state<1 | -1>(1);
  let limit = $state(400);
  let content: HTMLDivElement;

  const source = $derived(app.source!);
  const analysis = $derived(app.analysis!);
  const showFeatured = $derived(!app.flatMode && app.dir === '' && analysis.featured.length > 0);

  const sorted = $derived.by(() => {
    const cmp: Record<SortKey, (a: DiscFile, b: DiscFile) => number> = {
      name: (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
      size: (a, b) => a.size - b.size,
      kind: (a, b) => a.category.localeCompare(b.category) || a.kind.localeCompare(b.kind),
    };
    return [...app.visible].sort((a, b) => cmp[sortKey](a, b) * sortDir);
  });

  function sortBy(key: SortKey) {
    if (sortKey === key) sortDir = sortDir === 1 ? -1 : 1;
    else {
      sortKey = key;
      sortDir = key === 'size' ? -1 : 1;
    }
  }

  function play(e: Event, item: MediaItem) {
    e.stopPropagation();
    app.select(item);
    if (item.category === 'audio' && !item.unsupported) app.playAudio(item);
  }

  const canQuickPlay = (f: DiscFile) => f.category === 'audio' && browserCanShow(f.kind);
  const isSelected = (f: DiscFile) => app.selected?.files.includes(f) ?? false;
  const dirCount = (d: string) => source.files.filter((f) => f.dir === d || f.dir.startsWith(`${d}/`)).length;
  const itemSize = (it: MediaItem) => it.files.reduce((s, f) => s + f.size, 0);

  // Entrada escalonada al cambiar de carpeta, filtro o vista.
  $effect(() => {
    void [app.dir, app.filter, app.view, app.query.trim() === ''];
    limit = 400;
    tick().then(() => {
      if (!content || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.fromTo(
        [...content.querySelectorAll('[data-anim]')].slice(0, 36),
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.015, ease: 'power2.out', clearProps: 'all' },
      );
    });
  });
</script>

{#snippet sortHead(key: SortKey, label: string, cls = '')}
  <Table.Head class={cls}>
    <button class={cn('inline-flex items-center gap-1 hover:text-foreground', sortKey === key && 'text-foreground')} onclick={() => sortBy(key)}>
      {label}
      {#if sortKey === key}
        {#if sortDir === 1}<ArrowUp class="size-3" />{:else}<ArrowDown class="size-3" />{/if}
      {/if}
    </button>
  </Table.Head>
{/snippet}

<div class="p-4 md:p-6" bind:this={content}>
  {#if showFeatured}
    <section class="mb-8">
      <div class="mb-3 flex items-baseline justify-between">
        <h2 class="text-sm font-semibold">{t(analysis.featuredLabel)}</h2>
        <span class="text-xs text-muted-foreground">{t(`disc.${analysis.type}.label`)}</span>
      </div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
        {#each analysis.featured as item (item.id)}
          <div
            data-anim
            role="button"
            tabindex="0"
            class={cn(
              'group relative grid cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg',
              app.selected?.id === item.id && 'border-primary/60 ring-3 ring-primary/15',
            )}
            onclick={() => app.select(item)}
            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), app.select(item))}
          >
            <FileIcon category={item.category} class="size-10" />
            <div class="grid min-w-0 pr-8">
              <strong class="truncate text-sm font-semibold">{item.title()}</strong>
              <span class="truncate text-xs text-muted-foreground">{item.subtitle?.()}</span>
            </div>
            <div class="col-span-2 flex items-center gap-2">
              {#if item.duration}
                <Badge variant="secondary" class="gap-1 font-mono text-[11px] tabular"><Clock class="size-3" />{formatDuration(item.duration)}</Badge>
              {/if}
              <Badge variant="outline" class="font-mono text-[11px] tabular">{formatBytes(itemSize(item))}</Badge>
            </div>
            {#if !item.unsupported}
              <Button
                size="icon"
                class="absolute top-3.5 right-3.5 size-8 scale-90 rounded-full opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 group-focus-visible:opacity-100"
                onclick={(e) => play(e, item)}
                aria-label={t('action.play')}
              >
                <Play class="ml-0.5 fill-current" />
              </Button>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if !sorted.length && !app.subdirs.length}
    <Empty.Root class="py-20">
      <Empty.Header>
        <Empty.Media variant="icon"><SearchX /></Empty.Media>
        <Empty.Title>{t('browser.empty.title')}</Empty.Title>
        <Empty.Description>{app.flatMode ? t('browser.empty.search') : t('browser.empty.folder')}</Empty.Description>
      </Empty.Header>
    </Empty.Root>
  {:else if app.view === 'list'}
    {#if showFeatured}<h2 class="mb-2 text-sm font-semibold">{t('browser.allFiles')}</h2>{/if}
    <div class="overflow-hidden rounded-xl border bg-card/40">
      <Table.Root>
        <Table.Header>
          <Table.Row class="hover:bg-transparent">
            {@render sortHead('name', t('col.name'), 'pl-4')}
            {@render sortHead('kind', t('col.kind'), 'hidden md:table-cell')}
            {@render sortHead('size', t('col.size'), 'text-right')}
            <Table.Head class="hidden pr-4 xl:table-cell">{t('col.modified')}</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each app.subdirs as d (d)}
            <Table.Row data-anim class="cursor-pointer" onclick={() => (app.dir = d)}>
              <Table.Cell class="pl-4">
                <span class="flex items-center gap-3">
                  <span class="grid size-8 place-items-center text-muted-foreground"><Folder class="size-[18px]" /></span>
                  <span class="truncate font-medium">{d.split('/').pop()}</span>
                </span>
              </Table.Cell>
              <Table.Cell class="hidden text-muted-foreground md:table-cell">{t('kind.folder')}</Table.Cell>
              <Table.Cell class="text-right font-mono text-xs text-muted-foreground tabular">{tn('count.items', dirCount(d))}</Table.Cell>
              <Table.Cell class="hidden xl:table-cell"></Table.Cell>
            </Table.Row>
          {/each}
          {#each sorted.slice(0, limit) as file (file.path)}
            <Table.Row
              data-anim
              data-state={isSelected(file) ? 'selected' : undefined}
              class="group cursor-pointer data-[state=selected]:bg-primary/10"
              tabindex={0}
              onclick={() => app.selectFile(file)}
              ondblclick={() => canQuickPlay(file) && app.playAudio(itemForFile(file))}
              onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && app.selectFile(file)}
            >
              <Table.Cell class="max-w-0 pl-4">
                <span class="flex items-center gap-3">
                  <FileIcon category={file.category} class="size-8" />
                  <span class="grid min-w-0">
                    <span class="truncate font-medium">{file.name}</span>
                    {#if app.flatMode && file.dir}<span class="truncate font-mono text-[11px] text-muted-foreground">/{file.dir}</span>{/if}
                  </span>
                  {#if canQuickPlay(file)}
                    <Button
                      size="icon"
                      class="ml-auto size-7 shrink-0 rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-data-[state=selected]:opacity-100"
                      onclick={(e) => play(e, itemForFile(file))}
                      aria-label={t('action.play')}
                    >
                      <Play class="ml-0.5 size-3 fill-current" />
                    </Button>
                  {/if}
                </span>
              </Table.Cell>
              <Table.Cell class="hidden max-w-48 truncate text-muted-foreground md:table-cell">{kindLabel(file.kind)}</Table.Cell>
              <Table.Cell class="text-right font-mono text-xs text-muted-foreground tabular">{formatBytes(file.size)}</Table.Cell>
              <Table.Cell class="hidden pr-4 text-muted-foreground xl:table-cell">{formatDate(file.lastModified)}</Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  {:else}
    <div class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
      {#each app.subdirs as d (d)}
        <button data-anim class="grid gap-2 rounded-xl p-2 text-left transition-colors hover:bg-accent" onclick={() => (app.dir = d)}>
          <span class="grid aspect-[4/3] place-items-center rounded-lg border bg-card text-muted-foreground"><Folder class="size-10" strokeWidth={1.4} /></span>
          <span class="truncate px-0.5 text-sm">{d.split('/').pop()}</span>
        </button>
      {/each}
      {#each sorted.slice(0, limit) as file (file.path)}
        <button
          data-anim
          class={cn('grid gap-2 rounded-xl border border-transparent p-2 text-left transition-colors hover:bg-accent', isSelected(file) && 'border-primary/50 bg-primary/10')}
          onclick={() => app.selectFile(file)}
        >
          <span class="grid aspect-[4/3] place-items-center overflow-hidden rounded-lg border bg-card">
            {#if file.category === 'image' && browserCanShow(file.kind)}
              <Thumb {file} />
            {:else}
              <FileIcon category={file.category} class="size-12" />
            {/if}
          </span>
          <span class="grid px-0.5">
            <span class="truncate text-sm" title={file.name}>{file.name}</span>
            <span class="font-mono text-[11px] text-muted-foreground tabular">{formatBytes(file.size)}</span>
          </span>
        </button>
      {/each}
    </div>
  {/if}

  {#if sorted.length > limit}
    <div class="mt-6 flex justify-center">
      <Button variant="outline" onclick={() => (limit += 400)}>{t('browser.more', { n: sorted.length - limit })}</Button>
    </div>
  {/if}
</div>
