<script lang="ts">
  import type { Category } from '../lib/types';
  import { CATEGORY_ICONS } from '../lib/icons';

  let { category, size = 36 }: { category: Category; size?: number } = $props();
  const Icon = $derived(CATEGORY_ICONS[category]);
</script>

<span class="tile" style:--c="var(--c-{category})" style:--s="{size}px">
  <Icon size={Math.round(size * 0.46)} strokeWidth={1.75} />
</span>

<style>
  .tile {
    display: grid;
    place-items: center;
    flex: none;
    width: var(--s);
    height: var(--s);
    border-radius: calc(var(--s) * 0.28);
    color: var(--c);
    background: color-mix(in srgb, var(--c) 13%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 18%, transparent);
  }
</style>
