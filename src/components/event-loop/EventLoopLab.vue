<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
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

const source = ref<Task[]>([...exampleTasks])
const sourceLines = ref<string[]>([...exampleSourceLines])
const currentIndex = ref(0)
const activeSourceIndex = ref<number | null>(null)
const callStack = ref<QueueItem[]>([])
const microtasks = ref<QueueItem[]>([])
const macrotasks = ref<QueueItem[]>([])
const consoleOutput = ref<string[]>([])
const phase = ref<Phase>('idle')
const lastAction = ref('Example loaded.')
const pendingRender = ref(false)
const itemCounter = ref(0)
const rootRef = ref<HTMLElement | null>(null)

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
  lastAction.value = 'State reset.'
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

function getSourceLineElement(index: number) {
  return rootRef.value?.querySelector(`[data-source-line-index="${index}"]`) as HTMLElement | null
}

function getQueueLastItem(queueId: string) {
  const queueRoot = rootRef.value?.querySelector(`[data-queue-id="${queueId}"]`) as HTMLElement | null
  const items = queueRoot?.querySelectorAll('[data-queue-item]')
  return items && items.length ? (items[items.length - 1] as HTMLElement) : null
}

function getConsoleTarget() {
  const lastLine = rootRef.value?.querySelector('[data-console-line]:last-of-type') as HTMLElement | null
  if (lastLine) return lastLine
  return rootRef.value?.querySelector('[data-console-body]') as HTMLElement | null
}

async function animateTransfer(fromEl: HTMLElement | null, toEl: HTMLElement | null, label: string) {
  if (!fromEl || !toEl || typeof window === 'undefined') return
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) return

  const fromRect = fromEl.getBoundingClientRect()
  const toRect = toEl.getBoundingClientRect()
  const token = document.createElement('div')
  token.textContent = label
  token.style.position = 'fixed'
  token.style.left = `${fromRect.left + fromRect.width / 2}px`
  token.style.top = `${fromRect.top + fromRect.height / 2}px`
  token.style.transform = 'translate(-50%, -50%)'
  token.style.padding = '4px 8px'
  token.style.borderRadius = '9999px'
  token.style.border = '1px solid rgba(113,113,122,.4)'
  token.style.background = 'rgba(255,255,255,.92)'
  token.style.boxShadow = '0 8px 20px rgba(0,0,0,.15)'
  token.style.fontSize = '12px'
  token.style.lineHeight = '1'
  token.style.fontWeight = '600'
  token.style.pointerEvents = 'none'
  token.style.zIndex = '70'
  document.body.appendChild(token)

  const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2)
  const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2)
  const animation = token.animate(
    [
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.82)`, opacity: 0.15 }
    ],
    { duration: 480, easing: 'cubic-bezier(.22,.61,.36,1)' }
  )

  await animation.finished.catch(() => undefined)
  token.remove()
}

async function step() {
  if (!canStep.value) {
    phase.value = 'idle'
    activeSourceIndex.value = null
    lastAction.value = 'No pending work.'
    return
  }

  if (currentIndex.value < source.value.length) {
    const sourceIndex = currentIndex.value
    activeSourceIndex.value = sourceIndex
    const task = source.value[sourceIndex]
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
      await nextTick()
      await animateTransfer(getSourceLineElement(sourceIndex), getConsoleTarget(), 'log')
      return
    }

    if (task.type === 'micro-log') {
      microtasks.value.push({
        id: nextId('micro'),
        label: `Promise.then(() => console.log('${task.message}'))`
      })
      lastAction.value = `Microtask queued: ${task.message}`
      pendingRender.value = true
      await nextTick()
      await animateTransfer(getSourceLineElement(sourceIndex), getQueueLastItem('microtasks'), 'micro')
      return
    }

    macrotasks.value.push({
      id: nextId('macro'),
      label: `setTimeout(() => console.log('${task.message}'), 0)`
    })
    lastAction.value = `Macrotask queued: ${task.message}`
    pendingRender.value = true
    await nextTick()
    await animateTransfer(getSourceLineElement(sourceIndex), getQueueLastItem('macrotasks'), 'macro')
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

</script>

<template>
  <section ref="rootRef" class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
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
      <QueuePanel title="Call Stack" queue-id="stack" :items="callStack" empty-text="stack is empty" />
      <QueuePanel title="Microtask Queue" queue-id="microtasks" :items="microtasks" empty-text="microtasks are empty" />
      <QueuePanel title="Macrotask Queue" queue-id="macrotasks" :items="macrotasks" empty-text="macrotasks are empty" />
      <ConsolePanel :output="consoleOutput" />
    </div>

    <button
      type="button"
      class="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 px-4 py-3 text-sm font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
      :disabled="!canStep"
      @click="step"
    >
      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fill-rule="evenodd"
          d="M4.25 10a.75.75 0 0 1 .75-.75h8.19L9.72 5.78a.75.75 0 1 1 1.06-1.06l4.75 4.75a.75.75 0 0 1 0 1.06l-4.75 4.75a.75.75 0 1 1-1.06-1.06l3.47-3.47H5a.75.75 0 0 1-.75-.75Z"
          clip-rule="evenodd"
        />
      </svg>
      Next Step
    </button>
  </section>
</template>
