// WebTorrent P2P video streaming layer
// WebTorrent is loaded from CDN (index.html script tag) to avoid Node.js
// bundling issues. We access it via window.WebTorrent.

declare global {
  interface Window {
    WebTorrent: any
  }
}

let _client: any = null

function getClient(): any {
  if (_client) return _client
  if (typeof window.WebTorrent === 'undefined') {
    throw new Error('WebTorrent not loaded yet. Ensure the CDN script is included in index.html.')
  }
  _client = new window.WebTorrent({
    tracker: {
      announce: [
        'wss://tracker.openwebtorrent.com',
        'wss://tracker.webtorrent.dev',
        'wss://tracker.files.fm:7073/announce',
      ],
    },
  })
  _client.on('error', (err: Error) => {
    console.error('[WebTorrent] client error:', err.message)
  })
  // WebTorrent internally uses WebRTC; some browsers throw NotSupportedError
  // when a specific RTC operation isn't available. Catch it here so it doesn't
  // surface as a cryptic unhandledrejection.
  _client.on('warning', (warn: Error | string) => {
    console.warn('[WebTorrent] warning:', typeof warn === 'string' ? warn : warn.message)
  })
  console.log('[WebTorrent] client created')
  return _client
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface SeedResult {
  magnetURI: string
  infoHash: string
  fileSize: number
  fileName: string
}

export interface StreamState {
  progress: number      // 0–1
  downloadSpeed: number // bytes/sec
  numPeers: number
  ready: boolean
}

// ── Seeding (upload) ──────────────────────────────────────────────────────────

export function seedFile(
  file: File,
  onProgress?: (state: StreamState) => void,
): Promise<SeedResult> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.seed(file, (torrent: any) => {
      torrent.on('error', reject)
      torrent.on('upload', () => {
        onProgress?.({
          progress: 1,
          downloadSpeed: 0,
          numPeers: torrent.numPeers,
          ready: true,
        })
      })

      resolve({
        magnetURI: torrent.magnetURI,
        infoHash: torrent.infoHash,
        fileSize: file.size,
        fileName: file.name,
      })
    })
  })
}

// ── Streaming (playback) ──────────────────────────────────────────────────────

export function streamToElement(
  magnetURI: string,
  videoEl: HTMLVideoElement,
  onProgress?: (state: StreamState) => void,
): Promise<() => void> {
  const client = getClient()

  // Check if already added
  const existing = client.get(magnetURI)
  if (existing) {
    attachVideoFile(existing, videoEl, onProgress)
    return Promise.resolve(() => {})
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Torrent load timeout — no peers found'))
    }, 30_000)

    client.add(magnetURI, { maxWebConns: 5 }, (torrent: any) => {
      clearTimeout(timeout)

      const progressInterval = setInterval(() => {
        onProgress?.({
          progress: torrent.progress,
          downloadSpeed: torrent.downloadSpeed,
          numPeers: torrent.numPeers,
          ready: torrent.ready,
        })
      }, 1000)

      torrent.on('error', (err: Error) => {
        clearInterval(progressInterval)
        console.error('[WebTorrent] torrent error:', err.message)
      })

      attachVideoFile(torrent, videoEl, onProgress)

      resolve(() => {
        clearInterval(progressInterval)
        try { client.remove(magnetURI) } catch {}
      })
    })
  })
}

function attachVideoFile(
  torrent: any,
  videoEl: HTMLVideoElement,
  onProgress?: (s: StreamState) => void,
) {
  const file = torrent.files.reduce((largest: any, f: any) =>
    f.length > (largest?.length ?? 0) ? f : largest,
    null,
  )
  if (!file) return

  file.renderTo(videoEl, { autoplay: false }, (err: Error | null) => {
    if (err) {
      console.warn('[WebTorrent] renderTo error, falling back to blob URL:', err)
      file.getBlobURL((blobErr: Error | null, url: string) => {
        if (!blobErr && url) videoEl.src = url
      })
    }
  })

  torrent.on('ready', () => {
    onProgress?.({
      progress: torrent.progress,
      downloadSpeed: torrent.downloadSpeed,
      numPeers: torrent.numPeers,
      ready: true,
    })
  })
}

// ── Thumbnail capture ─────────────────────────────────────────────────────────

export function captureThumbnail(file: File, seekTo = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const objectURL = URL.createObjectURL(file)
    video.src = objectURL

    video.addEventListener('loadedmetadata', () => {
      video.currentTime = Math.min(seekTo, video.duration * 0.1)
    })

    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas')
      const scale = 360 / video.videoHeight
      canvas.width = Math.round(video.videoWidth * scale)
      canvas.height = 360
      canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(objectURL)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    })

    video.addEventListener('error', () => {
      URL.revokeObjectURL(objectURL)
      reject(new Error('Could not load video for thumbnail'))
    })

    video.load()
  })
}

// ── Video metadata ────────────────────────────────────────────────────────────

export function getVideoMeta(file: File): Promise<{
  duration: number
  width: number
  height: number
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    const url = URL.createObjectURL(file)
    video.src = url
    video.addEventListener('loadedmetadata', () => {
      resolve({ duration: video.duration, width: video.videoWidth, height: video.videoHeight })
      URL.revokeObjectURL(url)
    })
    video.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to read video metadata'))
    })
    video.load()
  })
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

export function destroyTorrentClient(): void {
  if (!_client) return
  _client.destroy()
  _client = null
}
