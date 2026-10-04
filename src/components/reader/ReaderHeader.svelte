<script lang="ts">
  import Search from '@lucide/svelte/icons/search';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import Languages from '@lucide/svelte/icons/languages';
  import List from '@lucide/svelte/icons/list';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import MonitorDown from '@lucide/svelte/icons/monitor-down';
  import Check from '@lucide/svelte/icons/check';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Kbd } from '$lib/components/ui/kbd/index.js';
  import { app, type ViewMode } from '$lib/state.svelte';
  import { theme } from '$lib/theme.svelte';
  import { i18n, LANGS, t } from '$lib/i18n/index.svelte';
  import { getNative } from '$lib/native';
  import { cn } from '$lib/utils';

  let { desktopUrl }: { desktopUrl: string } = $props();
  const isDesktop = !!getNative();
  let search = $state<HTMLInputElement | null>(null);
  const crumbs = $derived(app.dir ? app.dir.split('/') : []);

  function onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (app.source && tag !== 'INPUT' && tag !== 'TEXTAREA' && (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'))) {
      e.preventDefault();
      search?.focus();
    }
    if (e.key === 'Escape' && tag !== 'INPUT') app.select(null);
  }
</script>

<svelte:window onkeydown={onKey} />

<header class="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-xl md:px-4">
  <Sidebar.Trigger class="-ml-1" />
  <Separator orientation="vertical" class="mx-1 data-[orientation=vertical]:h-5" />

  <Breadcrumb.Root class="min-w-0 flex-1 md:flex-none">
    <Breadcrumb.List class="flex-nowrap">
      {#if !app.source}
        <Breadcrumb.Item><Breadcrumb.Page>{t('reader.title')}</Breadcrumb.Page></Breadcrumb.Item>
      {:else if app.flatMode}
        <Breadcrumb.Item class="hidden md:inline-flex">
          <Breadcrumb.Link class="cursor-pointer" onclick={() => ((app.filter = 'all'), (app.query = ''))}>{app.source.label}</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator class="hidden md:block" />
        <Breadcrumb.Item>
          <Breadcrumb.Page class="truncate">
            {app.query.trim() ? t('browser.results', { q: app.query.trim() }) : t(`cat.${app.filter}`)}
          </Breadcrumb.Page>
        </Breadcrumb.Item>
      {:else}
        <Breadcrumb.Item>
          {#if crumbs.length}
            <Breadcrumb.Link class="cursor-pointer" onclick={() => (app.dir = '')}>{app.source.label}</Breadcrumb.Link>
          {:else}
            <Breadcrumb.Page>{app.source.label}</Breadcrumb.Page>
          {/if}
        </Breadcrumb.Item>
        {#each crumbs as c, i (i)}
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            {#if i === crumbs.length - 1}
              <Breadcrumb.Page class="font-mono text-[13px]">{c}</Breadcrumb.Page>
            {:else}
              <Breadcrumb.Link class="cursor-pointer font-mono text-[13px]" onclick={() => (app.dir = crumbs.slice(0, i + 1).join('/'))}>{c}</Breadcrumb.Link>
            {/if}
          </Breadcrumb.Item>
        {/each}
      {/if}
    </Breadcrumb.List>
  </Breadcrumb.Root>

  {#if app.source}
    <div class="relative ml-auto hidden w-full max-w-sm sm:block">
      <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input bind:ref={search} bind:value={app.query} type="search" placeholder={t('search.placeholder')} class="h-9 pr-10 pl-8" spellcheck="false" autocomplete="off" />
      <Kbd class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">/</Kbd>
    </div>

    <ToggleGroup.Root
      type="single"
      size="sm"
      variant="outline"
      value={app.view}
      onValueChange={(v) => v && (app.view = v as ViewMode)}
      class="hidden md:flex"
      aria-label={t('browser.view')}
    >
      <ToggleGroup.Item value="list" aria-label={t('browser.list')}><List /></ToggleGroup.Item>
      <ToggleGroup.Item value="grid" aria-label={t('browser.grid')}><LayoutGrid /></ToggleGroup.Item>
    </ToggleGroup.Root>
  {/if}

  <div class={cn("ml-auto flex items-center gap-1", app.source && "sm:ml-0")}>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="sm" class="gap-1.5 px-2 font-mono text-xs" aria-label={t('nav.language')}>
            <Languages class="size-4" />{i18n.lang.toUpperCase()}
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="min-w-36">
        {#each LANGS as lang (lang)}
          <DropdownMenu.Item onSelect={() => i18n.set(lang)}>
            <span class="flex-1">{t(`lang.${lang}`)}</span>
            {#if i18n.lang === lang}<Check class="size-4" />{/if}
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="icon" class="size-8" onclick={() => theme.toggle()} aria-label={theme.current === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}>
            {#if theme.current === 'dark'}<Sun />{:else}<Moon />{/if}
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content>{theme.current === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}</Tooltip.Content>
    </Tooltip.Root>

    {#if !isDesktop}
      <Button href={desktopUrl} target="_blank" rel="noopener" variant="outline" size="sm" class="hidden lg:inline-flex">
        <MonitorDown />{t('nav.desktop')}
      </Button>
    {/if}
  </div>
</header>
