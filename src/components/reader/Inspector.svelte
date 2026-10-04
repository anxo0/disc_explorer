<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import X from '@lucide/svelte/icons/x';
  import Clock from '@lucide/svelte/icons/clock';
  import * as Sheet from '$lib/components/ui/sheet/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import { IsMobile } from '$lib/hooks/is-mobile.svelte.js';
  import type { MediaItem } from '$lib/types';
  import { app } from '$lib/state.svelte';
  import { formatDuration } from '$lib/format';
  import { t } from '$lib/i18n/index.svelte';
  import MediaPreview from './MediaPreview.svelte';
  import ExportPanel from './ExportPanel.svelte';

  let { item }: { item: MediaItem } = $props();
  const narrow = new IsMobile(1100);
</script>

{#snippet body()}
  <div class="grid content-start gap-6 p-5">
    {#key item.id}
      <MediaPreview {item} />
    {/key}
    <div class="grid justify-items-start gap-1.5">
      <h2 class="text-lg leading-tight font-semibold break-words">{item.title()}</h2>
      {#if item.subtitle}<p class="font-mono text-[11.5px] break-all text-muted-foreground">{item.subtitle()}</p>{/if}
      {#if item.duration}
        <Badge variant="secondary" class="mt-1 gap-1 font-mono tabular"><Clock class="size-3" />{formatDuration(item.duration)}</Badge>
      {/if}
    </div>

    <dl class="grid text-[13px]">
      {#each item.meta() as [label, value], i (i)}
        <div class="grid grid-cols-[104px_1fr] gap-3 border-b py-2 first:border-t {label ? '' : '-mt-px border-t-0 pt-0'}">
          <dt class="text-muted-foreground">{label}</dt>
          <dd class="break-words">{value}</dd>
        </div>
      {/each}
    </dl>

    <Separator />
    {#key item.id}
      <ExportPanel {item} />
    {/key}
  </div>
{/snippet}

{#if narrow.current}
  <Sheet.Root open onOpenChange={(open) => !open && app.select(null)}>
    <Sheet.Content side="right" class="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
      <Sheet.Header class="border-b px-5 py-4">
        <Sheet.Title class="text-xs font-medium tracking-wider text-muted-foreground uppercase">{t(`cat.${item.category}`)}</Sheet.Title>
      </Sheet.Header>
      {@render body()}
    </Sheet.Content>
  </Sheet.Root>
{:else}
  <aside
    class="flex w-[380px] shrink-0 flex-col border-l bg-sidebar/40 2xl:w-[420px]"
    aria-label={t('inspector.label')}
    in:fly={{ x: 24, duration: 260, easing: cubicOut }}
  >
    <div class="flex h-12 shrink-0 items-center justify-between border-b pr-2 pl-5">
      <span class="text-xs font-medium tracking-wider text-muted-foreground uppercase">{t(`cat.${item.category}`)}</span>
      <Button variant="ghost" size="icon" class="size-8" onclick={() => app.select(null)} aria-label={t('action.close')}><X /></Button>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto">
      {@render body()}
    </div>
  </aside>
{/if}
