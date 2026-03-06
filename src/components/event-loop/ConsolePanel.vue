<script setup lang="ts">
defineProps<{
  output: string[]
}>()
</script>

<template>
  <section class="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
    <h3 class="text-sm font-semibold tracking-wide">Console Output</h3>
    <div class="mt-3 rounded-md border border-zinc-200 bg-white p-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950">
      <p v-if="!output.length" class="text-zinc-500 dark:text-zinc-400">console is empty</p>
      <p v-for="(line, index) in output" :key="`${index}-${line}`" class="leading-6">
        {{ line }}
      </p>
    </div>
  </section>
</template>
