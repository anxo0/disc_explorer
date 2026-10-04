<script lang="ts">
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Folder from '@lucide/svelte/icons/folder';
  import FolderOpen from '@lucide/svelte/icons/folder-open';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import * as Collapsible from '$lib/components/ui/collapsible/index.js';
  import { app } from '$lib/state.svelte';
  import FolderTree from './FolderTree.svelte';

  let { dir, depth = 0 }: { dir: string; depth?: number } = $props();

  const children = $derived(app.source?.dirs.filter((d) => d.startsWith(`${dir}/`) && !d.slice(dir.length + 1).includes('/')) ?? []);
  const inPath = $derived(app.dir === dir || app.dir.startsWith(`${dir}/`));
  const active = $derived(!app.flatMode && app.dir === dir);
  const name = $derived(dir.split('/').pop());
  let open = $state(false);

  // Se despliega solo cuando navegamos dentro de la carpeta.
  $effect(() => {
    if (inPath) open = true;
  });

  function go() {
    app.filter = 'all';
    app.query = '';
    app.dir = dir;
  }
</script>

{#if depth === 0}
  <Collapsible.Root bind:open class="group/collapsible">
    <Sidebar.MenuItem>
      <Sidebar.MenuButton isActive={active} onclick={go} title={`/${dir}`}>
        {#if inPath}<FolderOpen />{:else}<Folder />{/if}
        <span class="font-mono text-[12.5px]">{name}</span>
      </Sidebar.MenuButton>
      {#if children.length}
        <Collapsible.Trigger>
          {#snippet child({ props })}
            <Sidebar.MenuAction {...props} class="transition-transform data-[state=open]:rotate-90">
              <ChevronRight />
            </Sidebar.MenuAction>
          {/snippet}
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Sidebar.MenuSub>
            {#each children as child (child)}
              <FolderTree dir={child} depth={depth + 1} />
            {/each}
          </Sidebar.MenuSub>
        </Collapsible.Content>
      {/if}
    </Sidebar.MenuItem>
  </Collapsible.Root>
{:else}
  <Sidebar.MenuSubItem>
    <Sidebar.MenuSubButton isActive={active} onclick={go} title={`/${dir}`} class="cursor-pointer">
      <span class="font-mono text-[12px]">{name}</span>
    </Sidebar.MenuSubButton>
    {#if children.length && (open || inPath)}
      <Sidebar.MenuSub>
        {#each children as child (child)}
          <FolderTree dir={child} depth={depth + 1} />
        {/each}
      </Sidebar.MenuSub>
    {/if}
  </Sidebar.MenuSubItem>
{/if}
