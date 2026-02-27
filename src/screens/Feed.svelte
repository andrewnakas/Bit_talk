<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import VideoPlayer from '../components/VideoPlayer.svelte'
  import {
    feedVideos, feedLoading, feedError, currentIndex, engagementData,
    addRawVideo, rawVideos, feedError as feedErr,
  } from '../stores/feed'
  import { algorithmWeights } from '../stores/algorithm'
  import { identity } from '../stores/identity'
  import { subscribeToVideoFeed } from '../core/nostr'
  import { getCachedFollows, getLikedEventIds, getWatchHistory, recordWatch } from '../core/storage'
  import { rankVideos, buildEmptyContext, computeTopicAffinities } from '../core/algorithm'
  import { navigate } from '../router'
  import type { StoredVideo } from '../core/storage'
  import { SEED_VIDEOS } from '../core/seedVideos'

  let containerEl: HTMLElement
  let unsubFeed: (() => void) | null = null
  let likedIds = $state<Set<string>>(new Set())
  let commentOpenFor = $state<string | null>(null)

  // Re-rank whenever raw videos or weights change
  $effect(() => {
    const videos = $rawVideos
    const weights = $algorithmWeights
    if (videos.length === 0) return
    rerankFeed(videos, weights)
  })

  async function rerankFeed(videos: StoredVideo[], weights: any) {
    const myPubkey = $identity?.pk ?? ''
    const follows = myPubkey ? await getCachedFollows(myPubkey) : []
    const history = await getWatchHistory()
    const likedSet = await getLikedEventIds()
    likedIds = likedSet

    const topicAffinities = computeTopicAffinities(
      history.map(h => {
        const video = videos.find(v => v.eventId === h.eventId)
        return {
          hashtags: video?.hashtags ?? [],
          watchDuration: h.watchDuration,
          totalDuration: h.totalDuration,
        }
      })
    )

    const ctx = buildEmptyContext()
    ctx.follows = new Set(follows)
    ctx.watchedIds = new Set(history.filter(h => h.watchDuration / h.totalDuration > 0.8).map(h => h.eventId))
    ctx.topicAffinities = topicAffinities
    ctx.likedIds = likedSet

    const ranked = rankVideos(videos, weights, ctx, $engagementData)
    feedVideos.set(ranked)
    feedLoading.set(false)
  }

  onMount(async () => {
    feedLoading.set(true)
    feedError.set(null)

    // Seed the feed immediately with public-domain demo videos so users
    // see content right away while Nostr relays are still connecting.
    for (const video of SEED_VIDEOS) {
      addRawVideo(video)
    }

    const myPubkey = $identity?.pk ?? ''
    const follows = myPubkey ? await getCachedFollows(myPubkey) : []

    // Subscribe to videos from follows + global discovery
    unsubFeed = subscribeToVideoFeed({
      follows: follows.length > 0 ? follows : undefined,
      limit: 50,
      onEvent: (video) => {
        addRawVideo(video)
      },
    })

    // If no videos come in after 5s, show a hint
    setTimeout(() => {
      if ($feedVideos.length === 0) {
        feedLoading.set(false)
        feedError.set('No videos found yet. Be the first to upload!')
      }
    }, 8000)
  })

  onDestroy(() => {
    unsubFeed?.()
  })

  function handleScroll() {
    if (!containerEl) return
    const idx = Math.round(containerEl.scrollTop / window.innerHeight)
    currentIndex.set(idx)

    // Record partial watch for previous video
    const prev = $feedVideos[idx - 1]
    if (prev) {
      recordWatch({
        eventId: prev.eventId,
        watchedAt: Date.now(),
        watchDuration: 5,   // approximate: user scrolled past after ~5s
        totalDuration: prev.duration ?? 30,
      }).catch(console.error)
    }
  }

  function handleLogin() {
    navigate('login')
  }
</script>

<div class="feed-container" bind:this={containerEl} onscroll={handleScroll}>
  {#if $feedLoading}
    <div class="state-screen">
      <div class="spinner"></div>
      <p>Connecting to peers…</p>
    </div>
  {:else if $feedVideos.length === 0}
    <div class="state-screen">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:.4">
          <path d="m15 10 4.553-2.069A1 1 0 0 1 21 8.87v6.26a1 1 0 0 1-1.447.893L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
        </svg>
      </div>
      <p style="opacity:.6;text-align:center;padding:0 24px">
        {$feedError ?? 'No videos yet. Upload something or check back soon.'}
      </p>
      <button class="btn-cta" onclick={() => navigate('upload')}>Upload first video</button>
    </div>
  {:else}
    {#each $feedVideos as video, i (video.eventId)}
      <VideoPlayer
        {video}
        active={$currentIndex === i}
        liked={likedIds.has(video.eventId)}
        likeCount={$engagementData.get(video.eventId)?.likes ?? 0}
        commentCount={$engagementData.get(video.eventId)?.comments ?? 0}
        onComment={() => commentOpenFor = video.eventId}
      />
    {/each}
  {/if}
</div>

<!-- Comment sheet (simplified) -->
{#if commentOpenFor}
  <div class="comment-sheet">
    <button class="sheet-handle" onclick={() => commentOpenFor = null} aria-label="Close comments"></button>
    <div class="sheet-body">
      <p style="color:rgba(255,255,255,.5);font-size:13px;text-align:center;padding:20px">
        Comments — coming in next update
      </p>
    </div>
  </div>
{/if}

<style>
  .feed-container {
    height: 100dvh;
    overflow-y: scroll;
    scroll-snap-type: y mandatory;
    scroll-behavior: smooth;
    /* Hide scrollbar */
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .feed-container::-webkit-scrollbar {
    display: none;
  }

  .state-screen {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: #fff;
    background: #0a0a0a;
  }

  .spinner {
    width: 36px;
    height: 36px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .state-screen p { font-size: 14px; margin: 0; }

  .btn-cta {
    margin-top: 8px;
    padding: 12px 28px;
    background: #fff;
    color: #0a0a0a;
    border: none;
    border-radius: 24px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-cta:active { opacity: 0.8; }

  /* Comment sheet */
  .comment-sheet {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    z-index: 50;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .sheet-handle {
    flex: 1;
    cursor: pointer;
    background: none;
    border: none;
    display: block;
    width: 100%;
  }

  .sheet-body {
    background: #1a1a1a;
    border-radius: 16px 16px 0 0;
    min-height: 300px;
    padding: 8px 0;
  }
</style>
