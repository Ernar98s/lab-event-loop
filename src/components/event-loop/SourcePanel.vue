<script setup lang="ts">
defineProps<{
  lines: string[]
  currentIndex: number
  activeIndex: number | null
}>()
</script>

<template>
  <section class="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
    <h3 class="text-sm font-semibold tracking-wide">Source</h3>
    <div class="mt-3 overflow-x-auto rounded-md border border-zinc-200 bg-white p-0 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950">
      <div
        v-for="(line, index) in lines"
        :key="`${index}-${line}`"
        class="grid grid-cols-[2.5rem_1fr] gap-2 px-3 py-2"
        :class="
          activeIndex === index
            ? 'bg-black text-white dark:bg-white dark:text-black'
            : index < currentIndex
              ? 'text-zinc-500 dark:text-zinc-400'
              : ''
        "
      >
        <span class="select-none text-right">{{ index + 1 }}</span>
        <span>{{ line }}</span>
      </div>
    </div>
  </section>
</template>
