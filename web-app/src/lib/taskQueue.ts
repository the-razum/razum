import crypto from 'crypto'

interface QueuedTask {
  id: string
  model: string
  prompt: string
  messages: Array<{ role: string; content: string }>
  createdAt: string
  assignedTo: string | null
  resolve?: (value: any) => void
  timeout?: NodeJS.Timeout
  // Streaming support
  streamChunks: string[]
  streamDone: boolean
}

const taskQueue: QueuedTask[] = []

export function addTaskToQueue(task: Omit<QueuedTask, 'id' | 'createdAt' | 'assignedTo' | 'streamChunks' | 'streamDone'>): { taskId: string; promise: Promise<any> } {
  const taskId = crypto.randomUUID()
  const promise = new Promise((resolve, reject) => {
    const queuedTask: QueuedTask = {
      ...task,
      id: taskId,
      createdAt: new Date().toISOString(),
      assignedTo: null,
      resolve,
      streamChunks: [],
      streamDone: false,
    }

    queuedTask.timeout = setTimeout(() => {
      const idx = taskQueue.indexOf(queuedTask)
      if (idx !== -1) taskQueue.splice(idx, 1)
      reject(new Error('Task timeout — no miner available'))
    }, 180000)

    taskQueue.push(queuedTask)
  })
  return { taskId, promise }
}

// Get task by ID (for streaming reads)
export function getTaskById(taskId: string): QueuedTask | null {
  return taskQueue.find(t => t.id === taskId) || null
}

export function getNextTask(minerModels: string[]): QueuedTask | null {
  return taskQueue.find(t => !t.assignedTo && minerModels.includes(t.model)) || null
}

// Atomic assign — returns false if already assigned (prevents race condition)
export function assignTask(taskId: string, minerId: string): boolean {
  const task = taskQueue.find(t => t.id === taskId)
  if (!task || task.assignedTo) return false // already taken
  task.assignedTo = minerId
  return true
}

// Push a streaming chunk from miner
export function pushStreamChunk(taskId: string, minerId: string, chunk: string): boolean {
  const task = taskQueue.find(t => t.id === taskId && t.assignedTo === minerId)
  if (!task) return false
  task.streamChunks.push(chunk)
  return true
}

// Read streaming chunks from a given index (for SSE forwarding)
export function readStreamChunks(taskId: string, fromIndex: number): { chunks: string[]; done: boolean } | null {
  const task = taskQueue.find(t => t.id === taskId)
  if (!task) return null
  return {
    chunks: task.streamChunks.slice(fromIndex),
    done: task.streamDone,
  }
}

export function completeTask(taskId: string, minerId: string, result: any): boolean {
  const taskIdx = taskQueue.findIndex(t => t.id === taskId && t.assignedTo === minerId)
  if (taskIdx === -1) return false

  const task = taskQueue[taskIdx]
  task.streamDone = true
  if (task.resolve) task.resolve(result)
  if (task.timeout) clearTimeout(task.timeout)
  // Keep task briefly for SSE readers to drain, then remove
  setTimeout(() => {
    const idx = taskQueue.indexOf(task)
    if (idx !== -1) taskQueue.splice(idx, 1)
  }, 5000)
  return true
}

// Queue stats for monitoring
export function getQueueStats() {
  return {
    total: taskQueue.length,
    pending: taskQueue.filter(t => !t.assignedTo).length,
    assigned: taskQueue.filter(t => t.assignedTo).length,
  }
}
