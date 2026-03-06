<script setup lang="ts">
import type { QueueItem } from './types'

defineProps<{
  title: string
  items: QueueItem[]
  emptyText: string
}>()
</script>

<template>
  <section class="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
    <h3 class="text-sm font-semibold tracking-wide">{{ title }}</h3>
    <ul v-if="items.length" class="mt-3 space-y-2">
      <li
        v-for="item in items"
        :key="item.id"
        class="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      >
        {{ item.label }}
      </li>
    </ul>
    <p v-else class="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{{ emptyText }}</p>
  </section>
</template>
