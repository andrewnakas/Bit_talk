import { writable, derived } from 'svelte/store'
import type { StoredVideo } from '../core/storage'

// All videos fetched from Nostr relays (unranked)
export const rawVideos = writable<StoredVideo[]>([])

// Ranked videos output from algorithm (ready for display)
export const feedVideos = writable<StoredVideo[]>([])

// Index of current video in feed
export const currentIndex = writable<number>(0)

// Loading / error state
export const feedLoading = writable<boolean>(true)
export const feedError = writable<string | null>(null)

// Engagement data: eventId → { likes, comments }
export const engagementData = writable<Map<string, { likes: number; comments: number }>>(new Map())

// Derived: current video
export const currentVideo = derived(
  [feedVideos, currentIndex],
  ([$videos, $index]) => $videos[$index] ?? null,
)

// Helper to add or update a video in rawVideos
export function addRawVideo(video: StoredVideo): void {
  rawVideos.update(videos => {
    const idx = videos.findIndex(v => v.eventId === video.eventId)
    if (idx >= 0) {
      videos[idx] = video
      return [...videos]
    }
    return [...videos, video]
  })
}

// Update engagement count for a specific video
export function updateEngagement(
  eventId: string,
  delta: { likes?: number; comments?: number },
): void {
  engagementData.update(map => {
    const current = map.get(eventId) ?? { likes: 0, comments: 0 }
    map.set(eventId, {
      likes: current.likes + (delta.likes ?? 0),
      comments: current.comments + (delta.comments ?? 0),
    })
    return new Map(map)
  })
}
