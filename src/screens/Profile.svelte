<script lang="ts">
  import { onMount } from 'svelte'
  import { identity, myPubkey } from '../stores/identity'
  import { navigate, routeParam } from '../router'
  import { fetchProfile, publishFollowList, publishProfile, shortenPubkey, fetchFollows } from '../core/nostr'
  import { getCachedFollows, getVideosByPubkey, getCachedProfile, type CachedProfile, type StoredVideo } from '../core/storage'
  import { nip19 } from 'nostr-tools'

  // If routeParam is set, we're viewing another user's profile
  let viewPubkey = $derived($routeParam ?? $myPubkey)

  let profile = $state<CachedProfile | null>(null)
  let videos = $state<StoredVideo[]>([])
  let follows = $state<string[]>([])
  let isFollowing = $state(false)
  let isOwnProfile = $derived(viewPubkey === $myPubkey)
  let loading = $state(true)

  // Edit mode state
  let editing = $state(false)
  let editName = $state('')
  let editAbout = $state('')
  let saving = $state(false)

  onMount(async () => {
    if (!viewPubkey) {
      navigate('login')
      return
    }
    await loadProfile()
  })

  async function loadProfile() {
    loading = true
    try {
      // Load cached first, then refresh
      profile = await getCachedProfile(viewPubkey) ?? null
      const fresh = await fetchProfile(viewPubkey)
      if (fresh) profile = fresh

      videos = await getVideosByPubkey(viewPubkey)
      follows = await getCachedFollows(viewPubkey)

      if (!isOwnProfile && $myPubkey) {
        const myFollows = await getCachedFollows($myPubkey)
        isFollowing = myFollows.includes(viewPubkey)
      }
    } finally {
      loading = false
    }
  }

  async function handleFollow() {
    if (!$identity || !$myPubkey) return
    const myFollows = await getCachedFollows($myPubkey)
    let updated: string[]
    if (isFollowing) {
      updated = myFollows.filter(pk => pk !== viewPubkey)
    } else {
      updated = [...myFollows, viewPubkey]
    }
    await publishFollowList(updated)
    isFollowing = !isFollowing
  }

  function startEdit() {
    editName = profile?.name ?? ''
    editAbout = profile?.about ?? ''
    editing = true
  }

  async function saveProfile() {
    saving = true
    try {
      await publishProfile({ name: editName, about: editAbout })
      if (profile) {
        profile = { ...profile, name: editName, about: editAbout }
      }
      editing = false
    } finally {
      saving = false
    }
  }

  function displayName(p: CachedProfile | null): string {
    return p?.displayName ?? p?.name ?? shortenPubkey(viewPubkey)
  }
</script>

<div class="screen">
  <header class="header">
    <button class="back-btn" onclick={() => navigate('feed')} aria-label="Back">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
    </button>
    <h1>{isOwnProfile ? 'My Profile' : 'Profile'}</h1>
    {#if isOwnProfile}
      <button class="edit-btn" onclick={startEdit}>Edit</button>
    {/if}
  </header>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
    </div>
  {:else}
    <div class="profile-body">
      <!-- Avatar -->
      <div class="avatar-section">
        {#if profile?.picture}
          <img src={profile.picture} alt="Avatar" class="avatar" />
        {:else}
          <div class="avatar placeholder">
            {displayName(profile)[0]?.toUpperCase() ?? '?'}
          </div>
        {/if}
        <div class="identity-info">
          <h2 class="display-name">{displayName(profile)}</h2>
          <p class="npub">{nip19.npubEncode(viewPubkey).slice(0, 16)}…</p>
        </div>
      </div>

      {#if profile?.about}
        <p class="about">{profile.about}</p>
      {/if}

      <div class="stats-row">
        <div class="stat">
          <span class="stat-value">{videos.length}</span>
          <span class="stat-label">Videos</span>
        </div>
        <div class="stat">
          <span class="stat-value">{follows.length}</span>
          <span class="stat-label">Following</span>
        </div>
      </div>

      {#if !isOwnProfile}
        <button
          class="follow-btn"
          class:following={isFollowing}
          onclick={handleFollow}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      {/if}

      <!-- Videos grid -->
      {#if videos.length > 0}
        <h3 class="section-title">Videos</h3>
        <div class="video-grid">
          {#each videos as video (video.eventId)}
            <div class="video-thumb">
              {#if video.thumbnail}
                <img src={video.thumbnail} alt={video.title} />
              {:else}
                <div class="thumb-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="m15 10 4.553-2.069A1 1 0 0 1 21 8.87v6.26a1 1 0 0 1-1.447.893L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
                  </svg>
                </div>
              {/if}
              <span class="video-title-thumb">{video.title}</span>
            </div>
          {/each}
        </div>
      {:else}
        <p class="no-videos">No videos yet.</p>
      {/if}
    </div>
  {/if}

  <!-- Edit modal -->
  {#if editing}
    <div class="modal-overlay">
      <div class="modal">
        <h3>Edit Profile</h3>
        <div class="field">
          <label for="edit-name">Name</label>
          <input id="edit-name" type="text" bind:value={editName} maxlength="50" />
        </div>
        <div class="field">
          <label for="edit-about">About</label>
          <textarea id="edit-about" bind:value={editAbout} maxlength="300" rows="3"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" onclick={() => editing = false}>Cancel</button>
          <button class="btn-save" onclick={saveProfile} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
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
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }

  h1 { font-size: 18px; font-weight: 700; margin: 0; flex: 1; }

  .back-btn, .edit-btn {
    background: none;
    border: none;
    color: #fff;
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
  }

  .back-btn svg { width: 20px; height: 20px; display: block; }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 50vh;
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

  .profile-body {
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .avatar-section {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar.placeholder {
    background: rgba(255,255,255,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 700;
  }

  .identity-info { display: flex; flex-direction: column; gap: 4px; }
  .display-name { font-size: 20px; font-weight: 700; margin: 0; }
  .npub { font-size: 11px; color: rgba(255,255,255,0.4); margin: 0; font-family: monospace; }

  .about {
    font-size: 14px;
    color: rgba(255,255,255,0.7);
    margin: 0;
    line-height: 1.5;
  }

  .stats-row {
    display: flex;
    gap: 24px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-value { font-size: 20px; font-weight: 700; }
  .stat-label { font-size: 12px; color: rgba(255,255,255,0.5); }

  .follow-btn {
    padding: 10px 32px;
    border-radius: 24px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    border: none;
    background: #fff;
    color: #0a0a0a;
    align-self: flex-start;
    transition: opacity 0.15s;
  }

  .follow-btn.following {
    background: rgba(255,255,255,0.1);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.2);
  }

  .section-title {
    font-size: 16px;
    font-weight: 700;
    margin: 8px 0 0;
  }

  .video-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
  }

  .video-thumb {
    position: relative;
    aspect-ratio: 9/16;
    background: #1a1a1a;
    overflow: hidden;
    border-radius: 4px;
  }

  .video-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumb-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.3;
  }

  .thumb-placeholder svg { width: 24px; height: 24px; }

  .video-title-thumb {
    position: absolute;
    bottom: 4px;
    left: 4px;
    right: 4px;
    font-size: 9px;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .no-videos {
    font-size: 14px;
    color: rgba(255,255,255,0.4);
    text-align: center;
    padding: 32px;
  }

  /* Edit modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    z-index: 100;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .modal {
    background: #1a1a1a;
    border-radius: 16px 16px 0 0;
    padding: 24px 20px 40px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .modal h3 { font-size: 18px; font-weight: 700; margin: 0; }

  .field { display: flex; flex-direction: column; gap: 6px; }
  label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.6); }

  input, textarea {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 12px 14px;
    color: #fff;
    font-size: 15px;
    outline: none;
    font-family: inherit;
    resize: vertical;
  }

  input:focus, textarea:focus { border-color: rgba(255,255,255,0.35); }

  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }

  .btn-cancel {
    flex: 1;
    padding: 14px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    color: #fff;
    border-radius: 12px;
    font-size: 15px;
    cursor: pointer;
  }

  .btn-save {
    flex: 2;
    padding: 14px;
    background: #fff;
    border: none;
    color: #0a0a0a;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
  }

  .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
