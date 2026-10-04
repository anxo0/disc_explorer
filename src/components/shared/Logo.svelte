<script lang="ts">
  import DiscMark from './DiscMark.svelte';
  let { compact = false }: { compact?: boolean } = $props();
</script>

<span class="inline-flex items-center gap-2.5">
  <DiscMark class="size-7" />
  {#if !compact}
    <span class="text-[15px] font-medium tracking-tight">Disc<b class="font-bold">Lens</b></span>
  {/if}
</span>
