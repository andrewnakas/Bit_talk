<script lang="ts">
  import { subscribeToVideoFeed } from '../core/nostr'
  import type { StoredVideo } from '../core/storage'
  import { navigate } from '../router'

  const TRENDING_TAGS = [
    'music', 'art', 'dance', 'comedy', 'gaming', 'food',
    'travel', 'tech', 'news', 'sports', 'fashion', 'nature',
  ]

  let query = $state('')
  let results = $state<StoredVideo[]>([])
  let searching = $state(false)
  let unsub: (() => void) | null = null

  function handleSearch() {
    const q = query.trim().replace(/^#/, '').toLowerCase()
    if (!q) return
    doSearch([q])
  }

  function searchTag(tag: string) {
    query = `#${tag}`
    doSearch([tag])
  }

  function doSearch(tags: string[]) {
    unsub?.()
    results = []
    searching = true

    unsub = subscribeToVideoFeed({
      hashtags: tags,
      limit: 30,
      onEvent: (video) => {
        results = [...results, video].sort((a, b) => b.createdAt - a.createdAt)
        searching = false
      },
    })

    // If nothing comes back in 5s, clear spinner
    setTimeout(() => { searching = false }, 5000)
  }

  function clear() {
    unsub?.()
    results = []
    query = ''
    searching = false
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }
</script>

<div class="screen">
  <header class="header">
    <h1>Discover</h1>
  </header>

  <div class="search-bar">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
    <input
      type="search"
      bind:value={query}
      onkeydown={handleKeydown}
      placeholder="Search hashtags…"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
    />
    {#if query}
      <button class="clear-btn" onclick={clear} aria-label="Clear">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    {/if}
    <button class="search-btn" onclick={handleSearch}>Search</button>
  </div>

  {#if !query && results.length === 0}
    <section class="trending">
      <h2>Trending Topics</h2>
      <div class="tag-chips">
        {#each TRENDING_TAGS as tag}
          <button class="tag-chip" onclick={() => searchTag(tag)}>#{tag}</button>
        {/each}
      </div>
    </section>
  {/if}

  {#if searching}
    <div class="state-center">
      <div class="spinner"></div>
      <p>Searching relay network…</p>
    </div>
  {:else if results.length > 0}
    <section class="results">
      <p class="results-count">{results.length} video{results.length !== 1 ? 's' : ''} found</p>
      <div class="results-grid">
        {#each results as video (video.eventId)}
          <div class="result-card">
            {#if video.thumbnail}
              <img src={video.thumbnail} alt={video.title} class="result-thumb" />
            {:else}
              <div class="result-thumb placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="m15 10 4.553-2.069A1 1 0 0 1 21 8.87v6.26a1 1 0 0 1-1.447.893L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
                </svg>
              </div>
            {/if}
            <div class="result-info">
              <p class="result-title">{video.title}</p>
              <p class="result-tags">{video.hashtags.map(t => `#${t}`).join(' ')}</p>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {:else if query}
    <div class="state-center">
      <p style="opacity:.5">No videos found for <strong>{query}</strong></p>
    </div>
  {/if}
</div>

<style>
  .screen {
    min-height: 100dvh;
    background: #0a0a0a;
    color: #fff;
    padding-bottom: 80px;
  }

  .header {
    padding: 20px 16px 12px;
  }

  h1 { font-size: 22px; font-weight: 800; margin: 0; }

  .search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px 16px;
  }

  .search-icon {
    width: 18px;
    height: 18px;
    color: rgba(255,255,255,0.4);
    flex-shrink: 0;
    position: absolute;
    pointer-events: none;
  }

  .search-bar {
    position: relative;
  }

  .search-bar input {
    flex: 1;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 12px 40px 12px 40px;
    color: #fff;
    font-size: 15px;
    outline: none;
    min-width: 0;
  }

  .search-bar input:focus {
    border-color: rgba(255,255,255,0.3);
  }

  .search-bar input::placeholder { color: rgba(255,255,255,0.3); }

  .search-icon {
    position: absolute;
    left: 28px;
    top: 50%;
    transform: translateY(-60%);
  }

  .clear-btn {
    position: absolute;
    right: 90px;
    background: none;
    border: none;
    color: rgba(255,255,255,0.4);
    cursor: pointer;
    padding: 4px;
  }

  .clear-btn svg { width: 16px; height: 16px; display: block; }

  .search-btn {
    background: #fff;
    color: #0a0a0a;
    border: none;
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }

  /* Trending */
  .trending {
    padding: 8px 16px;
  }

  h2 { font-size: 16px; font-weight: 700; margin: 0 0 12px; }

  .tag-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag-chip {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.1);
    color: #fff;
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .tag-chip:hover { background: rgba(255,255,255,0.15); }

  /* State */
  .state-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 48px 24px;
    color: #fff;
    font-size: 14px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 2px solid rgba(255,255,255,0.15);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Results */
  .results { padding: 0 16px; }

  .results-count {
    font-size: 12px;
    color: rgba(255,255,255,0.4);
    margin: 0 0 12px;
  }

  .results-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .result-card {
    display: flex;
    gap: 12px;
    align-items: center;
    background: rgba(255,255,255,0.04);
    border-radius: 12px;
    overflow: hidden;
    padding: 0;
    cursor: pointer;
  }

  .result-thumb {
    width: 72px;
    height: 96px;
    object-fit: cover;
    flex-shrink: 0;
    border-radius: 8px;
  }

  .result-thumb.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.08);
    opacity: 0.5;
  }

  .result-thumb.placeholder svg { width: 24px; height: 24px; }

  .result-info {
    flex: 1;
    padding: 8px 12px 8px 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .result-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .result-tags {
    font-size: 11px;
    color: rgba(255,255,255,0.4);
    margin: 0;
  }
</style>
