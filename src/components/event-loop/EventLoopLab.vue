<script setup lang="ts">
import { computed, ref } from 'vue'
import ConsolePanel from './ConsolePanel.vue'
import QueuePanel from './QueuePanel.vue'
import SourcePanel from './SourcePanel.vue'
import type { Phase, QueueItem, Task } from './types'

const exampleSourceLines = [
  "console.log('1')",
  "setTimeout(() => console.log('2'), 0)",
  "Promise.resolve().then(() => console.log('3'))",
  "console.log('4')"
]

const exampleTasks: Task[] = [
  { type: 'sync-log', message: '1' },
  { type: 'macro-log', message: '2' },
  { type: 'micro-log', message: '3' },
  { type: 'sync-log', message: '4' }
]

const source = ref<Task[]>([])
const sourceLines = ref<string[]>([])
const currentIndex = ref(0)
const activeSourceIndex = ref<number | null>(null)
const callStack = ref<QueueItem[]>([])
const microtasks = ref<QueueItem[]>([])
const macrotasks = ref<QueueItem[]>([])
const consoleOutput = ref<string[]>([])
const phase = ref<Phase>('idle')
const lastAction = ref('Load example to start.')
const pendingRender = ref(false)
const itemCounter = ref(0)

const hasSource = computed(() => source.value.length > 0)
const canStep = computed(
  () =>
    currentIndex.value < source.value.length ||
    microtasks.value.length > 0 ||
    macrotasks.value.length > 0 ||
    pendingRender.value
)

function nextId(prefix: string) {
  itemCounter.value += 1
  return `${prefix}-${itemCounter.value}`
}

function resetState() {
  currentIndex.value = 0
  activeSourceIndex.value = null
  callStack.value = []
  microtasks.value = []
  macrotasks.value = []
  consoleOutput.value = []
  phase.value = 'idle'
  pendingRender.value = false
  lastAction.value = hasSource.value ? 'State reset.' : 'Load example to start.'
}

function loadExample() {
  source.value = [...exampleTasks]
  sourceLines.value = [...exampleSourceLines]
  itemCounter.value = 0
  resetState()
  lastAction.value = 'Example loaded.'
}

function executeLog(message: string, stackLabel: string, currentPhase: Phase) {
  const stackItem: QueueItem = {
    id: nextId('stack'),
    label: stackLabel
  }
  phase.value = currentPhase
  callStack.value = [stackItem]
  consoleOutput.value.push(message)
  callStack.value = []
}

function step() {
  if (!canStep.value) {
    phase.value = 'idle'
    activeSourceIndex.value = null
    lastAction.value = 'No pending work.'
    return
  }

  if (currentIndex.value < source.value.length) {
    activeSourceIndex.value = currentIndex.value
    const task = source.value[currentIndex.value]
    if (!task) {
      phase.value = 'idle'
      lastAction.value = 'No pending work.'
      return
    }

    currentIndex.value += 1
    phase.value = 'sync'

    if (task.type === 'sync-log') {
      executeLog(task.message, `console.log('${task.message}')`, 'sync')
      lastAction.value = `Sync log executed: ${task.message}`
      pendingRender.value = true
      return
    }

    if (task.type === 'micro-log') {
      microtasks.value.push({
        id: nextId('micro'),
        label: `Promise.then(() => console.log('${task.message}'))`
      })
      lastAction.value = `Microtask queued: ${task.message}`
      pendingRender.value = true
      return
    }

    macrotasks.value.push({
      id: nextId('macro'),
      label: `setTimeout(() => console.log('${task.message}'), 0)`
    })
    lastAction.value = `Macrotask queued: ${task.message}`
    pendingRender.value = true
    return
  }

  if (microtasks.value.length > 0) {
    activeSourceIndex.value = null
    const nextMicrotask = microtasks.value.shift()
    if (!nextMicrotask) return

    const value = /'([^']+)'/.exec(nextMicrotask.label)?.[1] ?? '?'
    executeLog(value, nextMicrotask.label, 'microtasks')
    lastAction.value = `Microtask executed: ${value}`
    pendingRender.value = true
    return
  }

  if (pendingRender.value) {
    activeSourceIndex.value = null
    phase.value = 'render'
    pendingRender.value = false
    lastAction.value = 'Render checkpoint.'
    return
  }

  if (macrotasks.value.length > 0) {
    activeSourceIndex.value = null
    const nextMacrotask = macrotasks.value.shift()
    if (!nextMacrotask) return

    const value = /'([^']+)'/.exec(nextMacrotask.label)?.[1] ?? '?'
    executeLog(value, nextMacrotask.label, 'macrotask')
    lastAction.value = `Macrotask executed: ${value}`
    pendingRender.value = true
    return
  }

  phase.value = 'idle'
  activeSourceIndex.value = null
  lastAction.value = 'Completed.'
}

function runAll() {
  let safetyLimit = 200
  while (canStep.value && safetyLimit > 0) {
    step()
    safetyLimit -= 1
  }
}
</script>

<template>
  <section class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Event Loop Lab</h1>
        <p class="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
          Симулятор показывает, как задачи проходят через Call Stack, Microtask Queue, Macrotask Queue и
          Render checkpoint.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          @click="loadExample"
        >
          Load example
        </button>
        <button
          type="button"
          class="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          :disabled="!canStep"
          @click="step"
        >
          Step
        </button>
        <button
          type="button"
          class="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          :disabled="!canStep"
          @click="runAll"
        >
          Run all
        </button>
        <button
          type="button"
          class="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          :disabled="!hasSource"
          @click="resetState"
        >
          Reset
        </button>
      </div>
    </div>

    <div class="mt-6 rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm dark:border-zinc-700">
      <span class="font-medium">Phase:</span> {{ phase }}
      <span class="mx-2 text-zinc-400">|</span>
      <span class="font-medium">Action:</span> {{ lastAction }}
    </div>

    <div class="mt-6">
      <SourcePanel :lines="sourceLines" :current-index="currentIndex" :active-index="activeSourceIndex" />
    </div>

    <div class="mt-4 grid gap-4 xl:grid-cols-4">
      <QueuePanel title="Call Stack" :items="callStack" empty-text="stack is empty" />
      <QueuePanel title="Microtask Queue" :items="microtasks" empty-text="microtasks are empty" />
      <QueuePanel title="Macrotask Queue" :items="macrotasks" empty-text="macrotasks are empty" />
      <ConsolePanel :output="consoleOutput" />
    </div>
  </section>
</template>
