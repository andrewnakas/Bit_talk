<script lang="ts">
  import { navigate, currentRoute } from '../router'
</script>

<nav class="navbar">
  <button
    class="nav-item"
    class:active={$currentRoute === 'feed'}
    onclick={() => navigate('feed')}
    aria-label="Feed"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="8" height="14" rx="1"/>
      <rect x="13" y="7" width="8" height="10" rx="1"/>
    </svg>
    <span>Feed</span>
  </button>

  <button
    class="nav-item"
    class:active={$currentRoute === 'discover'}
    onclick={() => navigate('discover')}
    aria-label="Discover"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
    <span>Discover</span>
  </button>

  <button
    class="nav-item nav-upload"
    class:active={$currentRoute === 'upload'}
    onclick={() => navigate('upload')}
    aria-label="Upload"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  </button>

  <button
    class="nav-item"
    class:active={$currentRoute === 'profile'}
    onclick={() => navigate('profile')}
    aria-label="Profile"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="8" r="4"/>
      <path d="M20 21a8 8 0 1 0-16 0"/>
    </svg>
    <span>Profile</span>
  </button>

  <button
    class="nav-item"
    class:active={$currentRoute === 'settings'}
    onclick={() => navigate('settings')}
    aria-label="Settings"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
    <span>Algorithm</span>
  </button>
</nav>

<style>
  .navbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: rgba(10, 10, 10, 0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 100;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.45);
    padding: 6px 12px;
    border-radius: 12px;
    transition: color 0.15s, background 0.15s;
    -webkit-tap-highlight-color: transparent;
    min-width: 48px;
  }

  .nav-item:active {
    background: rgba(255, 255, 255, 0.06);
  }

  .nav-item.active {
    color: #fff;
  }

  .nav-item svg {
    width: 22px;
    height: 22px;
  }

  .nav-item span {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  /* Upload button — prominent center CTA */
  .nav-upload {
    width: 48px;
    height: 38px;
    border-radius: 10px;
    background: #fff;
    color: #0a0a0a;
    padding: 0;
    align-items: center;
    justify-content: center;
  }

  .nav-upload.active,
  .nav-upload:hover {
    background: #e0e0e0;
    color: #0a0a0a;
  }

  .nav-upload svg {
    width: 20px;
    height: 20px;
  }
</style>
