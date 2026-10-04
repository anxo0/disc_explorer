<script lang="ts">
  import { cn } from '$lib/utils';
  let { class: className = 'size-8', spin = false }: { class?: string; spin?: boolean } = $props();
</script>

<span
  class={cn('iridescent relative inline-block shrink-0 rounded-full shadow-sm', spin && 'animate-[spin_8s_linear_infinite]', className)}
  aria-hidden="true"
>
  <span class="absolute inset-[30%] rounded-full bg-white/25 ring-1 ring-white/30"></span>
  <span class="absolute inset-[42%] rounded-full bg-background"></span>
</span>
