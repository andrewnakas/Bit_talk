import { writable } from 'svelte/store'
import {
  loadAlgorithmWeights,
  saveAlgorithmWeights,
  DEFAULT_ALGORITHM_WEIGHTS,
  type AlgorithmWeights,
} from '../core/storage'

// Reactive weights store — initialized with defaults, loaded from idb on boot
export const algorithmWeights = writable<AlgorithmWeights>({ ...DEFAULT_ALGORITHM_WEIGHTS })

// Load persisted weights from IndexedDB
export async function loadWeights(): Promise<void> {
  const saved = await loadAlgorithmWeights()
  algorithmWeights.set(saved)
}

// Persist weights to IndexedDB (called from Settings screen on change)
export async function persistWeights(weights: AlgorithmWeights): Promise<void> {
  algorithmWeights.set(weights)
  await saveAlgorithmWeights(weights)
}

// Reset to defaults
export async function resetWeights(): Promise<void> {
  await persistWeights({ ...DEFAULT_ALGORITHM_WEIGHTS })
}
