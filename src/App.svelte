<script lang="ts">
  import { onMount } from 'svelte'
  import NavBar from './components/NavBar.svelte'
  import Feed from './screens/Feed.svelte'
  import Upload from './screens/Upload.svelte'
  import Profile from './screens/Profile.svelte'
  import Discover from './screens/Discover.svelte'
  import Settings from './screens/Settings.svelte'
  import Login from './screens/Login.svelte'
  import { currentRoute, navigate } from './router'
  import { identity } from './stores/identity'
  import { loadOrCreateIdentity } from './core/identity'
  import { initNDK, setNDKSigner } from './core/nostr'
  import { loadWeights } from './stores/algorithm'
  import { NDKPrivateKeySigner } from '@nostr-dev-kit/ndk'

  let booting = $state(true)

  // Routes that don't need the NavBar
  const BARE_ROUTES = new Set(['login'])

  onMount(async () => {
    try {
      // 1. Load algorithm weights from IndexedDB
      await loadWeights()

      // 2. Load or create identity
      const id = await loadOrCreateIdentity()
      identity.set(id)

      // 3. Initialize NDK with signer
      if (id.sk.length > 0) {
        const signer = new NDKPrivateKeySigner(id.sk)
        await initNDK(signer)
      } else {
        // NIP-07 user — NDK init without signer (or already inited from login screen)
        await initNDK()
      }
    } catch (err) {
      console.error('[App] boot error:', err)
      // Still navigate to login on critical failure
      navigate('login')
    } finally {
      booting = false
    }
  })
</script>

{#if booting}
  <!-- Loading handled by inline HTML spinner in index.html -->
  <div class="boot-screen" aria-busy="true" aria-label="Loading"></div>
{:else}
  <main class="app" class:has-nav={!BARE_ROUTES.has($currentRoute)}>
    {#if $currentRoute === 'login'}
      <Login />
    {:else if $currentRoute === 'feed'}
      <Feed />
    {:else if $currentRoute === 'upload'}
      <Upload />
    {:else if $currentRoute === 'profile'}
      <Profile />
    {:else if $currentRoute === 'discover'}
      <Discover />
    {:else if $currentRoute === 'settings'}
      <Settings />
    {/if}

    {#if !BARE_ROUTES.has($currentRoute)}
      <NavBar />
    {/if}
  </main>
{/if}

<style>
  .boot-screen {
    height: 100dvh;
    background: #0a0a0a;
  }

  .app {
    min-height: 100dvh;
    background: #0a0a0a;
    position: relative;
  }
</style>
