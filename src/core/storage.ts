import { openDB, type IDBPDatabase } from 'idb'

// ── Types ────────────────────────────────────────────────────────────────────

export interface StoredIdentity {
  sk: string       // hex secret key
  pk: string       // hex public key
  createdAt: number
}

export interface WatchEntry {
  eventId: string
  watchedAt: number
  watchDuration: number   // seconds actually watched
  totalDuration: number   // video length in seconds
}

export interface LikeEntry {
  eventId: string
  likeEventId: string     // the Nostr kind 7 event id we published
  likedAt: number
}

export interface CachedProfile {
  pubkey: string
  name?: string
  displayName?: string
  picture?: string
  about?: string
  nip05?: string
  cachedAt: number
}

export interface CachedFollow {
  pubkey: string
  follows: string[]   // list of pubkeys
  cachedAt: number
}

export interface StoredVideo {
  eventId: string
  pubkey: string
  title: string
  summary: string
  magnetURI: string
  directURL?: string   // optional HTTP URL — used instead of WebTorrent when present
  thumbnail?: string   // data URL or IPFS CID
  duration?: number    // seconds
  dimensions?: string  // e.g. "1080x1920"
  hashtags: string[]
  createdAt: number    // Nostr event created_at (unix seconds)
  cachedAt: number
}

export interface AppSettings {
  relays: string[]
  theme: 'dark' | 'light' | 'system'
}

export interface AlgorithmWeights {
  recency: number           // 0–1
  engagement: number        // 0–1
  followingActivity: number // 0–1
  networkActivity: number   // 0–1
  watchHistory: number      // 0–1
  topicAffinity: number     // 0–1
  novelty: number           // 0–1
  diversity: number         // 0–1
}

export const DEFAULT_ALGORITHM_WEIGHTS: AlgorithmWeights = {
  recency: 0.7,
  engagement: 0.5,
  followingActivity: 0.9,
  networkActivity: 0.4,
  watchHistory: 0.6,
  topicAffinity: 0.5,
  novelty: 0.3,
  diversity: 0.4,
}

export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://nostr.wine',
]

// ── DB schema ────────────────────────────────────────────────────────────────

const DB_NAME = 'bittalk'
const DB_VERSION = 1

type BittalkDB = IDBPDatabase<{
  identity: {
    key: 'current'
    value: StoredIdentity
  }
  videos: {
    key: string        // eventId
    value: StoredVideo
    indexes: { by_pubkey: string; by_created: number }
  }
  profiles: {
    key: string        // pubkey
    value: CachedProfile
  }
  follows: {
    key: string        // pubkey
    value: CachedFollow
  }
  watchHistory: {
    key: string        // eventId
    value: WatchEntry
    indexes: { by_watched_at: number }
  }
  likes: {
    key: string        // eventId
    value: LikeEntry
  }
  settings: {
    key: 'app' | 'algorithm'
    value: AppSettings | AlgorithmWeights
  }
}>

let _db: BittalkDB | null = null

export async function getDB(): Promise<BittalkDB> {
  if (_db) return _db
  _db = await openDB<any>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // identity — single record
      if (!db.objectStoreNames.contains('identity')) {
        db.createObjectStore('identity')
      }

      // videos — indexed by pubkey and created_at for sorting
      if (!db.objectStoreNames.contains('videos')) {
        const vs = db.createObjectStore('videos', { keyPath: 'eventId' })
        vs.createIndex('by_pubkey', 'pubkey')
        vs.createIndex('by_created', 'createdAt')
      }

      // profiles — keyed by pubkey
      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'pubkey' })
      }

      // follows — keyed by pubkey
      if (!db.objectStoreNames.contains('follows')) {
        db.createObjectStore('follows', { keyPath: 'pubkey' })
      }

      // watchHistory — indexed by watchedAt for time-based queries
      if (!db.objectStoreNames.contains('watchHistory')) {
        const ws = db.createObjectStore('watchHistory', { keyPath: 'eventId' })
        ws.createIndex('by_watched_at', 'watchedAt')
      }

      // likes — keyed by eventId
      if (!db.objectStoreNames.contains('likes')) {
        db.createObjectStore('likes', { keyPath: 'eventId' })
      }

      // settings — 'app' and 'algorithm' records
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings')
      }
    },
  })
  return _db
}

// ── Identity ─────────────────────────────────────────────────────────────────

export async function loadIdentity(): Promise<StoredIdentity | undefined> {
  const db = await getDB()
  return db.get('identity', 'current')
}

export async function saveIdentity(identity: StoredIdentity): Promise<void> {
  const db = await getDB()
  await db.put('identity', identity, 'current')
}

// ── Videos ───────────────────────────────────────────────────────────────────

export async function cacheVideo(video: StoredVideo): Promise<void> {
  const db = await getDB()
  await db.put('videos', video)
}

export async function getCachedVideos(): Promise<StoredVideo[]> {
  const db = await getDB()
  return db.getAll('videos')
}

export async function getVideosByPubkey(pubkey: string): Promise<StoredVideo[]> {
  const db = await getDB()
  return db.getAllFromIndex('videos', 'by_pubkey', pubkey)
}

// ── Profiles ─────────────────────────────────────────────────────────────────

export async function cacheProfile(profile: CachedProfile): Promise<void> {
  const db = await getDB()
  await db.put('profiles', profile)
}

export async function getCachedProfile(pubkey: string): Promise<CachedProfile | undefined> {
  const db = await getDB()
  return db.get('profiles', pubkey)
}

// ── Follows ──────────────────────────────────────────────────────────────────

export async function cacheFollows(pubkey: string, follows: string[]): Promise<void> {
  const db = await getDB()
  await db.put('follows', { pubkey, follows, cachedAt: Date.now() })
}

export async function getCachedFollows(pubkey: string): Promise<string[]> {
  const db = await getDB()
  const entry = await db.get('follows', pubkey)
  return entry?.follows ?? []
}

// ── Watch History ─────────────────────────────────────────────────────────────

export async function recordWatch(entry: WatchEntry): Promise<void> {
  const db = await getDB()
  await db.put('watchHistory', entry)
}

export async function getWatchHistory(): Promise<WatchEntry[]> {
  const db = await getDB()
  return db.getAllFromIndex('watchHistory', 'by_watched_at')
}

// ── Likes ─────────────────────────────────────────────────────────────────────

export async function recordLike(entry: LikeEntry): Promise<void> {
  const db = await getDB()
  await db.put('likes', entry)
}

export async function removeLike(eventId: string): Promise<void> {
  const db = await getDB()
  await db.delete('likes', eventId)
}

export async function getLikedEventIds(): Promise<Set<string>> {
  const db = await getDB()
  const all = await db.getAll('likes')
  return new Set(all.map(l => l.eventId))
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function loadAppSettings(): Promise<AppSettings> {
  const db = await getDB()
  const stored = await db.get('settings', 'app') as AppSettings | undefined
  return stored ?? { relays: DEFAULT_RELAYS, theme: 'dark' }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const db = await getDB()
  await db.put('settings', settings, 'app')
}

export async function loadAlgorithmWeights(): Promise<AlgorithmWeights> {
  const db = await getDB()
  const stored = await db.get('settings', 'algorithm') as AlgorithmWeights | undefined
  return stored ?? { ...DEFAULT_ALGORITHM_WEIGHTS }
}

export async function saveAlgorithmWeights(weights: AlgorithmWeights): Promise<void> {
  const db = await getDB()
  await db.put('settings', weights, 'algorithm')
}
