<script lang="ts">
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import FolderOpen from '@lucide/svelte/icons/folder-open';
  import Folder from '@lucide/svelte/icons/folder';
  import Layers from '@lucide/svelte/icons/layers';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import X from '@lucide/svelte/icons/x';
  import Plus from '@lucide/svelte/icons/plus';
  import House from '@lucide/svelte/icons/house';
  import Clock from '@lucide/svelte/icons/clock';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import * as Collapsible from '$lib/components/ui/collapsible/index.js';
  import { app, type Filter } from '$lib/state.svelte';
  import { CATEGORIES } from '$lib/analyze';
  import { CATEGORY_ICONS } from '$lib/icons';
  import { formatDuration } from '$lib/format';
  import { formatBytes, formatNumber, tn, t } from '$lib/i18n/index.svelte';
  import DiscMark from '../shared/DiscMark.svelte';
  import Logo from '../shared/Logo.svelte';
  import FolderTree from './FolderTree.svelte';

  const sidebar = Sidebar.useSidebar();
  const source = $derived(app.source);
  const analysis = $derived(app.analysis);
  const categories = $derived(analysis ? CATEGORIES.filter((c) => analysis.totals[c].count > 0) : []);

  const TONE: Record<string, string> = {
    video: 'text-video',
    audio: 'text-audio',
    image: 'text-image',
    document: 'text-document',
    archive: 'text-archive',
    disc: 'text-disc',
    other: 'text-other',
  };

  function setFilter(f: Filter) {
    app.filter = f;
    app.query = '';
    if (sidebar.isMobile) sidebar.setOpenMobile(false);
  }

  /** Carpetas de primer nivel; el árbol se despliega recursivamente. */
  const roots = $derived(source ? source.dirs.filter((d) => !d.includes('/')) : []);
</script>

<Sidebar.Root collapsible="icon" variant="sidebar">
  <Sidebar.Header>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        {#if source && analysis}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}
                <Sidebar.MenuButton {...props} size="lg" class="data-[state=open]:bg-sidebar-accent">
                  <DiscMark class="size-8" spin />
                  <div class="grid flex-1 text-left leading-tight">
                    <span class="truncate text-sm font-semibold">{source.label}</span>
                    <span class="truncate text-xs text-muted-foreground">{t(`disc.${analysis.type}.label`)} · {formatBytes(analysis.totalSize)}</span>
                  </div>
                  <ChevronsUpDown class="ml-auto" />
                </Sidebar.MenuButton>
              {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="w-(--bits-dropdown-menu-anchor-width) min-w-60" align="start" sideOffset={6}>
              <DropdownMenu.Label class="text-xs text-muted-foreground">{t('sidebar.currentDisc')}</DropdownMenu.Label>
              <DropdownMenu.Item onSelect={() => app.openPicker()}>
                <Plus /> {t('sidebar.openAnother')}
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => app.close()}>
                <X /> {t('action.closeDisc')}
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item>
                {#snippet child({ props })}
                  <a href="./" {...props}><House /> {t('nav.home')}</a>
                {/snippet}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        {:else}
          <Sidebar.MenuButton size="lg">
            {#snippet child({ props })}
              <a href="./" {...props}><Logo /></a>
            {/snippet}
          </Sidebar.MenuButton>
        {/if}
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Header>

  <Sidebar.Content>
    {#if source && analysis}
      <Sidebar.Group>
        <Sidebar.GroupLabel>{t('sidebar.library')}</Sidebar.GroupLabel>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={app.filter === 'all' && !app.query} tooltipContent={t('cat.all')} onclick={() => setFilter('all')}>
              <Layers />
              <span>{t('cat.all')}</span>
            </Sidebar.MenuButton>
            <Sidebar.MenuBadge class="tabular">{formatNumber(source.files.length)}</Sidebar.MenuBadge>
          </Sidebar.MenuItem>
          {#each categories as c (c)}
            {@const Icon = CATEGORY_ICONS[c]}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton isActive={app.filter === c} tooltipContent={t(`cat.${c}`)} onclick={() => setFilter(c)}>
                <Icon class={TONE[c]} />
                <span>{t(`cat.${c}`)}</span>
              </Sidebar.MenuButton>
              <Sidebar.MenuBadge class="tabular">{formatNumber(analysis.totals[c].count)}</Sidebar.MenuBadge>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.Group>

      {#if analysis.featured.length}
        <Sidebar.Group class="group-data-[collapsible=icon]:hidden">
          <Sidebar.GroupLabel>{t(analysis.featuredLabel)}</Sidebar.GroupLabel>
          <Sidebar.Menu>
            {#each analysis.featured.slice(0, 30) as item (item.id)}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton isActive={app.selected?.id === item.id} onclick={() => app.select(item)}>
                  <span class="truncate">{item.title()}</span>
                </Sidebar.MenuButton>
                {#if item.duration}
                  <Sidebar.MenuBadge class="tabular font-mono text-[10.5px]"><Clock class="mr-1 size-3" />{formatDuration(item.duration)}</Sidebar.MenuBadge>
                {/if}
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.Group>
      {/if}

      {#if source.dirs.length}
        <Sidebar.Group class="group-data-[collapsible=icon]:hidden">
          <Sidebar.GroupLabel>{t('sidebar.folders')}</Sidebar.GroupLabel>
          <Sidebar.Menu>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                isActive={!app.flatMode && app.dir === ''}
                onclick={() => {
                  app.filter = 'all';
                  app.query = '';
                  app.dir = '';
                }}
              >
                <FolderOpen />
                <span>{t('meta.root')}</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
            {#each roots as dir (dir)}
              <FolderTree {dir} />
            {/each}
          </Sidebar.Menu>
        </Sidebar.Group>
      {/if}
    {:else}
      <Sidebar.Group>
        <Sidebar.GroupLabel>{t('sidebar.start')}</Sidebar.GroupLabel>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton tooltipContent={t('hero.open')} onclick={() => app.openPicker()}>
              <FolderOpen />
              <span>{t('hero.open')}</span>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton tooltipContent={t('nav.home')}>
              {#snippet child({ props })}
                <a href="./" {...props}><House /><span>{t('nav.home')}</span></a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.Group>
    {/if}
  </Sidebar.Content>

  <Sidebar.Footer>
    <div class="flex gap-2.5 rounded-lg border border-success/25 bg-success/8 p-3 text-xs leading-relaxed text-sidebar-foreground group-data-[collapsible=icon]:hidden">
      <ShieldCheck class="mt-0.5 size-4 shrink-0 text-success" />
      <span>{t('sidebar.readonly')}</span>
    </div>
    {#if source}
      <p class="px-2 pb-1 font-mono text-[11px] text-muted-foreground tabular group-data-[collapsible=icon]:hidden">
        {tn('count.files', source.files.length)} · {source.root}
      </p>
    {/if}
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>
