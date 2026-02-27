import NDK, {
  NDKEvent,
  NDKPrivateKeySigner,
  type NDKFilter,
  type NDKSigner,
} from '@nostr-dev-kit/ndk'
import { nip19 } from 'nostr-tools'
import { loadAppSettings, cacheVideo, cacheProfile, cacheFollows, type StoredVideo, type CachedProfile } from './storage'

// ── Constants ─────────────────────────────────────────────────────────────────

// NIP-71 kind for vertical video (portrait/short-form)
export const KIND_VERTICAL_VIDEO = 34235
export const KIND_METADATA = 0
export const KIND_TEXT_NOTE = 1
export const KIND_CONTACTS = 3
export const KIND_REACTION = 7

// ── NDK singleton ─────────────────────────────────────────────────────────────

let _ndk: NDK | null = null

export async function initNDK(signer?: NDKSigner): Promise<NDK> {
  if (_ndk) {
    if (signer) _ndk.signer = signer
    return _ndk
  }

  console.log('[NDK] loading settings…')
  const settings = await loadAppSettings()
  console.log('[NDK] relays:', settings.relays)

  _ndk = new NDK({
    explicitRelayUrls: settings.relays,
    signer,
    enableOutboxModel: false,
    autoFetchUserMutelist: false,
  })

  // connect() can hang indefinitely when WebSockets are blocked.
  // We race it against a 4-second hard timeout so the app always boots.
  console.log('[NDK] connecting to relays…')
  try {
    await Promise.race([
      _ndk.connect(3000),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('NDK connect timeout')), 4000)
      ),
    ])
    console.log('[NDK] connected')
  } catch (err) {
    console.warn('[NDK] relay connect failed or timed out — continuing offline:', err)
  }

  return _ndk
}

export function getNDK(): NDK {
  if (!_ndk) throw new Error('NDK not initialized. Call initNDK() first.')
  return _ndk
}

export function setNDKSigner(sk: Uint8Array): void {
  const ndk = getNDK()
  ndk.signer = new NDKPrivateKeySigner(sk)
}

// ── NIP-07 signer ─────────────────────────────────────────────────────────────

export class Nip07Signer implements NDKSigner {
  async blockUntilReady(): Promise<import('@nostr-dev-kit/ndk').NDKUser> {
    const pk = await (window as any).nostr.getPublicKey()
    return getNDK().getUser({ pubkey: pk })
  }

  async user(): Promise<import('@nostr-dev-kit/ndk').NDKUser> {
    const pk = await (window as any).nostr.getPublicKey()
    return getNDK().getUser({ pubkey: pk })
  }

  async sign(event: NDKEvent): Promise<string> {
    const signed = await (window as any).nostr.signEvent(event.rawEvent())
    return signed.sig
  }

  async encrypt(recipient: import('@nostr-dev-kit/ndk').NDKUser, value: string): Promise<string> {
    return (window as any).nostr.nip04?.encrypt(recipient.pubkey, value) ?? value
  }

  async decrypt(sender: import('@nostr-dev-kit/ndk').NDKUser, value: string): Promise<string> {
    return (window as any).nostr.nip04?.decrypt(sender.pubkey, value) ?? value
  }
}

// ── Video events ──────────────────────────────────────────────────────────────

export interface VideoEventData {
  title: string
  summary: string
  magnetURI: string
  thumbnail?: string   // base64 data URL or URL
  duration?: number    // seconds
  dimensions?: string  // "1080x1920"
  fileSize?: number    // bytes
  mimeType?: string    // "video/mp4"
  hashtags?: string[]
}

export async function publishVideo(data: VideoEventData): Promise<NDKEvent> {
  const ndk = getNDK()
  const event = new NDKEvent(ndk)
  event.kind = KIND_VERTICAL_VIDEO
  event.content = data.summary

  const tags: string[][] = [
    ['title', data.title],
    ['summary', data.summary],
    ['magnet', data.magnetURI],
  ]

  if (data.thumbnail) tags.push(['thumb', data.thumbnail])
  if (data.duration) tags.push(['duration', String(Math.round(data.duration))])
  if (data.dimensions) tags.push(['dim', data.dimensions])
  if (data.fileSize) tags.push(['size', String(data.fileSize)])
  if (data.mimeType) tags.push(['m', data.mimeType])

  for (const tag of (data.hashtags ?? [])) {
    tags.push(['t', tag.toLowerCase().replace(/^#/, '')])
  }

  // 'd' tag required for NIP-71 addressable events
  tags.push(['d', crypto.randomUUID()])

  event.tags = tags

  await event.publish()
  return event
}

// ── Feed subscription ─────────────────────────────────────────────────────────

export interface VideoFeedOptions {
  follows?: string[]     // pubkeys to filter to; if empty, fetch global
  hashtags?: string[]
  since?: number         // unix timestamp
  limit?: number
  onEvent: (video: StoredVideo) => void
}

export function subscribeToVideoFeed(options: VideoFeedOptions): () => void {
  const ndk = getNDK()

  const filter: NDKFilter = {
    kinds: [KIND_VERTICAL_VIDEO],
    limit: options.limit ?? 50,
  }

  if (options.follows && options.follows.length > 0) {
    filter.authors = options.follows
  }

  if (options.since) {
    filter.since = options.since
  }

  if (options.hashtags && options.hashtags.length > 0) {
    filter['#t'] = options.hashtags
  }

  const sub = ndk.subscribe(filter, { closeOnEose: false })

  sub.on('event', (event: NDKEvent) => {
    const video = ndkEventToStoredVideo(event)
    if (!video) return
    cacheVideo(video).catch(console.error)
    options.onEvent(video)
  })

  return () => sub.stop()
}

function ndkEventToStoredVideo(event: NDKEvent): StoredVideo | null {
  if (!event.id || !event.pubkey) return null

  const getTag = (name: string) => event.tags.find(t => t[0] === name)?.[1]
  const title = getTag('title') ?? getTag('summary') ?? event.content.slice(0, 80)
  const magnetURI = getTag('magnet')
  if (!magnetURI) return null  // not a valid video event without magnet

  return {
    eventId: event.id,
    pubkey: event.pubkey,
    title,
    summary: event.content,
    magnetURI,
    thumbnail: getTag('thumb'),
    duration: getTag('duration') ? parseInt(getTag('duration')!) : undefined,
    dimensions: getTag('dim'),
    hashtags: event.tags.filter(t => t[0] === 't').map(t => t[1]),
    createdAt: event.created_at ?? Math.floor(Date.now() / 1000),
    cachedAt: Date.now(),
  }
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function fetchProfile(pubkey: string): Promise<CachedProfile | null> {
  const ndk = getNDK()
  try {
    const user = ndk.getUser({ pubkey })
    await user.fetchProfile()
    const p = user.profile
    if (!p) return null

    const cached: CachedProfile = {
      pubkey,
      name: p.name,
      displayName: p.displayName,
      picture: p.image,
      about: p.about,
      nip05: p.nip05,
      cachedAt: Date.now(),
    }
    await cacheProfile(cached)
    return cached
  } catch {
    return null
  }
}

export async function publishProfile(meta: {
  name: string
  about?: string
  picture?: string
  nip05?: string
}): Promise<void> {
  const ndk = getNDK()
  const event = new NDKEvent(ndk)
  event.kind = KIND_METADATA
  event.content = JSON.stringify(meta)
  await event.publish()
}

// ── Social actions ────────────────────────────────────────────────────────────

export async function publishLike(targetEventId: string, targetPubkey: string): Promise<NDKEvent> {
  const ndk = getNDK()
  const event = new NDKEvent(ndk)
  event.kind = KIND_REACTION
  event.content = '+'
  event.tags = [
    ['e', targetEventId],
    ['p', targetPubkey],
  ]
  await event.publish()
  return event
}

export async function publishComment(
  content: string,
  parentEventId: string,
  parentPubkey: string,
): Promise<NDKEvent> {
  const ndk = getNDK()
  const event = new NDKEvent(ndk)
  event.kind = KIND_TEXT_NOTE
  event.content = content
  event.tags = [
    ['e', parentEventId, '', 'reply'],
    ['p', parentPubkey],
  ]
  await event.publish()
  return event
}

export async function publishFollowList(followPubkeys: string[]): Promise<void> {
  const ndk = getNDK()
  const event = new NDKEvent(ndk)
  event.kind = KIND_CONTACTS
  event.content = ''
  event.tags = followPubkeys.map(pk => ['p', pk])
  await event.publish()
  // Cache locally
  const signer = ndk.signer
  if (signer) {
    const user = await signer.user()
    await cacheFollows(user.pubkey, followPubkeys)
  }
}

// ── Fetch follows ─────────────────────────────────────────────────────────────

export async function fetchFollows(pubkey: string): Promise<string[]> {
  const ndk = getNDK()
  const filter: NDKFilter = {
    kinds: [KIND_CONTACTS],
    authors: [pubkey],
    limit: 1,
  }

  return new Promise(resolve => {
    const sub = ndk.subscribe(filter, { closeOnEose: true })
    sub.on('event', async (event: NDKEvent) => {
      const follows = event.tags
        .filter(t => t[0] === 'p' && t[1])
        .map(t => t[1])
      await cacheFollows(pubkey, follows)
      resolve(follows)
    })
    sub.on('eose', () => resolve([]))
  })
}

// ── Fetch comments ────────────────────────────────────────────────────────────

export function subscribeToComments(
  parentEventId: string,
  onComment: (event: NDKEvent) => void,
): () => void {
  const ndk = getNDK()
  const sub = ndk.subscribe(
    { kinds: [KIND_TEXT_NOTE], '#e': [parentEventId] },
    { closeOnEose: false },
  )
  sub.on('event', onComment)
  return () => sub.stop()
}

// ── Fetch reaction counts ─────────────────────────────────────────────────────

export function subscribeLikeCount(
  eventId: string,
  onCount: (count: number) => void,
): () => void {
  const ndk = getNDK()
  let count = 0
  const sub = ndk.subscribe(
    { kinds: [KIND_REACTION], '#e': [eventId] },
    { closeOnEose: false },
  )
  sub.on('event', (event: NDKEvent) => {
    if (event.content === '+' || event.content === '❤️') {
      count++
      onCount(count)
    }
  })
  return () => sub.stop()
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function shortenPubkey(pubkey: string): string {
  const npub = nip19.npubEncode(pubkey)
  return npub.slice(0, 8) + '…' + npub.slice(-4)
}
