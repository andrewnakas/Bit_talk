<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { streamToElement } from '../core/torrent'
  import { publishLike } from '../core/nostr'
  import { recordLike, removeLike } from '../core/storage'
  import { identity } from '../stores/identity'
  import { updateEngagement } from '../stores/feed'
  import type { StoredVideo } from '../core/storage'

  interface Props {
    video: StoredVideo
    active: boolean           // is this card the currently-visible one?
    liked?: boolean
    likeCount?: number
    commentCount?: number
    onComment?: () => void
  }

  let { video, active, liked = false, likeCount = 0, commentCount = 0, onComment }: Props = $props()

  let videoEl: HTMLVideoElement = $state(null as any)
  let streamCleanup: (() => void) | null = null
  // Local overridable state — synced from props but can be overridden on user action
  let _liked = $state(false)
  let _likeCount = $state(0)
  $effect(() => { _liked = liked })
  $effect(() => { _likeCount = likeCount })
  let progress = $state(0)
  let numPeers = $state(0)
  let streamError = $state<string | null>(null)
  let loading = $state(true)
  let showStats = $state(false)
  let isMuted = $state(true)
  // Tracks which video eventId is currently streaming so we skip duplicate startStream calls
  // when feedVideos updates object references without actually changing the video.
  let streamingId = $state<string | null>(null)

  // Load / unload stream based on whether this card is active.
  // Guard: only call startStream when the active video actually changes (by eventId).
  $effect(() => {
    if (active) {
      if (video.eventId !== streamingId) {
        streamingId = video.eventId
        startStream()
      }
    } else {
      if (streamingId !== null) {
        streamingId = null
        stopStream()
      }
    }
  })

  async function startStream() {
    if (!videoEl) return
    loading = true
    streamError = null

    // If a direct HTTP URL is available, use it — no WebTorrent/WebRTC needed.
    if (video.directURL) {
      console.log('[VideoPlayer] using directURL for', video.title)
      videoEl.onerror = () => {
        console.warn('[VideoPlayer] directURL load error for', video.title)
        streamError = 'Could not load video'
      }
      videoEl.src = video.directURL
      loading = false  // clear spinner immediately; browser handles buffering natively
      videoEl.play().catch(() => {
        // autoplay blocked — user can tap to play; onerror handles broken URLs
      })
      return
    }

    // Fall back to WebTorrent P2P for user-uploaded content.
    console.log('[VideoPlayer] starting WebTorrent stream for', video.title)
    try {
      streamCleanup = await streamToElement(video.magnetURI, videoEl, state => {
        progress = state.progress
        numPeers = state.numPeers
        if (state.ready) loading = false
      })
    } catch (err: any) {
      console.warn('[VideoPlayer] streamToElement error:', err?.message)
      streamError = err?.message ?? 'Could not load video'
      loading = false
    }
  }

  function stopStream() {
    if (streamCleanup) {
      streamCleanup()
      streamCleanup = null
    }
    if (videoEl) {
      videoEl.pause()
      videoEl.src = ''
      videoEl.onerror = null
    }
  }

  async function handleLike() {
    if (!$identity) return
    if (_liked) {
      _liked = false
      _likeCount -= 1
      await removeLike(video.eventId)
      updateEngagement(video.eventId, { likes: -1 })
    } else {
      _liked = true
      _likeCount += 1
      try {
        const event = await publishLike(video.eventId, video.pubkey)
        await recordLike({ eventId: video.eventId, likeEventId: event.id!, likedAt: Date.now() })
        updateEngagement(video.eventId, { likes: 1 })
        navigator.vibrate?.(10)
      } catch (err) {
        // Revert on error
        _liked = false
        _likeCount -= 1
      }
    }
  }

  function handleVideoClick() {
    if (!videoEl) return
    if (videoEl.paused) {
      videoEl.play()
    } else {
      videoEl.pause()
    }
  }

  onDestroy(() => stopStream())
</script>

<div class="video-card" class:active>
  <!-- Video element -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="video-wrap" onclick={handleVideoClick}>
    <video
      bind:this={videoEl}
      class="video"
      playsinline
      loop
      autoplay={active}
      muted={isMuted}
      preload="none"
    ></video>

    <!-- Muted indicator — tap to unmute -->
    {#if isMuted}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="muted-badge" onclick={(e) => { e.stopPropagation(); isMuted = false }}>
        <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px">
          <path d="M5.889 16H2a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h3.889l5.294-4.332A.5.5 0 0 1 12 4.138V19.86a.5.5 0 0 1-.817.332L5.89 16zm13.517-7.364a1 1 0 0 1 0 1.414l-1.414 1.414 1.414 1.414a1 1 0 0 1-1.414 1.414l-1.414-1.414-1.414 1.414a1 1 0 0 1-1.414-1.414l1.414-1.414-1.414-1.414a1 1 0 0 1 1.414-1.414l1.414 1.414 1.414-1.414a1 1 0 0 1 1.414 0z"/>
        </svg>
        <span>Tap to unmute</span>
      </div>
    {/if}

    {#if loading && !streamError}
      <div class="overlay-center">
        <div class="spinner"></div>
        {#if numPeers > 0}
          <span class="peer-count">{numPeers} peer{numPeers !== 1 ? 's' : ''}</span>
        {/if}
      </div>
    {/if}

    {#if streamError}
      <div class="overlay-center error-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;opacity:.6">
          <path d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
        </svg>
        <p>No peers online</p>
        <button onclick={startStream}>Retry</button>
      </div>
    {/if}
  </div>

  <!-- Right sidebar: actions -->
  <div class="sidebar">
    <button
      class="action-btn like-btn"
      class:liked={_liked}
      onclick={handleLike}
      aria-label="Like"
    >
      <svg viewBox="0 0 24 24" fill={_liked ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      <span>{_likeCount}</span>
    </button>

    <button class="action-btn" onclick={onComment} aria-label="Comment">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span>{commentCount}</span>
    </button>

    <button
      class="action-btn stats-btn"
      onclick={() => showStats = !showStats}
      aria-label="P2P Stats"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    </button>
  </div>

  <!-- Bottom info overlay -->
  <div class="info-overlay">
    <div class="video-meta">
      <h3 class="video-title">{video.title}</h3>
      {#if video.hashtags.length > 0}
        <p class="hashtags">
          {video.hashtags.map(t => `#${t}`).join(' ')}
        </p>
      {/if}
    </div>
  </div>

  <!-- P2P stats overlay (toggled) -->
  {#if showStats}
    <div class="stats-overlay">
      <p>Peers: {numPeers}</p>
      <p>Progress: {Math.round(progress * 100)}%</p>
      <p class="magnet-hint">Magnet: {video.magnetURI.slice(0, 50)}…</p>
    </div>
  {/if}
</div>

<style>
  .video-card {
    position: relative;
    width: 100%;
    height: 100dvh;
    background: #0a0a0a;
    scroll-snap-align: start;
    overflow: hidden;
    flex-shrink: 0;
  }

  .video-wrap {
    width: 100%;
    height: 100%;
    position: relative;
    cursor: pointer;
  }

  .video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000;
  }

  .muted-badge {
    position: absolute;
    top: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    padding: 5px 10px;
    border-radius: 20px;
    backdrop-filter: blur(4px);
    cursor: pointer;
    z-index: 15;
    user-select: none;
  }

  .overlay-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: rgba(0, 0, 0, 0.3);
    color: #fff;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .peer-count {
    font-size: 12px;
    opacity: 0.7;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: rgba(255,255,255,0.7);
  }

  .error-state button {
    margin-top: 8px;
    padding: 8px 20px;
    background: rgba(255,255,255,0.15);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
  }

  /* Right sidebar */
  .sidebar {
    position: absolute;
    right: 12px;
    bottom: 100px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    z-index: 10;
  }

  .action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: #fff;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    -webkit-tap-highlight-color: transparent;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5));
  }

  .action-btn svg {
    width: 28px;
    height: 28px;
  }

  .like-btn { transition: transform 0.15s; }
  .like-btn:active { transform: scale(1.3); }
  .like-btn.liked { color: #ff2d55; }

  /* Bottom info */
  .info-overlay {
    position: absolute;
    bottom: 70px;
    left: 0;
    right: 68px;
    padding: 0 16px;
    z-index: 10;
  }

  .video-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .video-title {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    margin: 0;
    text-shadow: 0 1px 4px rgba(0,0,0,0.5);
    line-height: 1.3;
  }

  .hashtags {
    font-size: 13px;
    color: rgba(255,255,255,0.8);
    margin: 0;
    text-shadow: 0 1px 3px rgba(0,0,0,0.4);
  }

  /* P2P stats panel */
  .stats-overlay {
    position: absolute;
    top: 60px;
    right: 12px;
    background: rgba(0,0,0,0.7);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 11px;
    color: rgba(255,255,255,0.8);
    z-index: 20;
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 240px;
  }

  .stats-overlay p { margin: 0; }
  .magnet-hint { word-break: break-all; opacity: 0.6; font-size: 10px; }
</style>
