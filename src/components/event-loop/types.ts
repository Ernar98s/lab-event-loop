export type Task =
  | { type: 'sync-log'; message: string }
  | { type: 'macro-log'; message: string }
  | { type: 'micro-log'; message: string }

export type QueueItem = {
  id: string
  label: string
}

export type Phase = 'idle' | 'sync' | 'microtasks' | 'render' | 'macrotask'
