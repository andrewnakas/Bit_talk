<script lang="ts">
  import { onMount } from 'svelte'
  import NavBar from './components/NavBar.svelte'
  import DebugConsole from './components/DebugConsole.svelte'
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
    console.log('[App] boot start')
    try {
      // 1. Load algorithm weights from IndexedDB
      console.log('[App] loading weights…')
      await loadWeights()
      console.log('[App] weights loaded')

      // 2. Load or create identity
      console.log('[App] loading identity…')
      const id = await loadOrCreateIdentity()
      identity.set(id)
      console.log('[App] identity ready, pk:', id.pk.slice(0, 8) + '…')

      // 3. Initialize NDK with signer
      console.log('[App] init NDK…')
      if (id.sk.length > 0) {
        const signer = new NDKPrivateKeySigner(id.sk)
        await initNDK(signer)
      } else {
        await initNDK()
      }
      console.log('[App] NDK ready')
    } catch (err) {
      console.error('[App] boot error:', err)
      navigate('login')
    } finally {
      booting = false
      console.log('[App] booting=false, rendering app')
    }
  })
</script>

<DebugConsole />

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
