<script lang="ts">
  import {
    generateIdentity,
    importFromNsec,
    loginWithNip07,
    persistIdentity,
    hasNip07Extension,
  } from '../core/identity'
  import { initNDK, setNDKSigner } from '../core/nostr'
  import { identity } from '../stores/identity'
  import { NDKPrivateKeySigner } from '@nostr-dev-kit/ndk'
  import { navigate } from '../router'

  let mode = $state<'choose' | 'import'>('choose')
  let nsecInput = $state('')
  let error = $state('')
  let loading = $state(false)
  let showNsec = $state(false)
  let generatedNsec = $state<string | null>(null)

  const hasExtension = hasNip07Extension()

  async function loginWithExtension() {
    loading = true
    error = ''
    try {
      const id = await loginWithNip07()
      if (!id) throw new Error('Extension returned no public key')
      const { Nip07Signer } = await import('../core/nostr')
      await initNDK(new Nip07Signer())
      identity.set(id)
      navigate('feed')
    } catch (e: any) {
      error = e.message ?? 'Extension login failed'
    } finally {
      loading = false
    }
  }

  async function createNewKey() {
    loading = true
    error = ''
    try {
      const id = generateIdentity()
      generatedNsec = id.nsec
      const signer = new NDKPrivateKeySigner(id.sk)
      await initNDK(signer)
      await persistIdentity(id)
      identity.set(id)
      // Show backup screen briefly then go to feed
    } catch (e: any) {
      error = e?.message ?? 'Failed to create identity'
    } finally {
      loading = false
    }
  }

  async function importNsec() {
    error = ''
    const id = importFromNsec(nsecInput.trim())
    if (!id) {
      error = 'Invalid nsec key — must start with "nsec1…"'
      return
    }
    loading = true
    try {
      const signer = new NDKPrivateKeySigner(id.sk)
      await initNDK(signer)
      await persistIdentity(id)
      identity.set(id)
      navigate('feed')
    } catch (e: any) {
      error = e?.message ?? 'Failed to import key'
    } finally {
      loading = false
    }
  }

  function continueToFeed() {
    generatedNsec = null
    navigate('feed')
  }
</script>

<div class="screen">
  <div class="logo-area">
    <h1 class="logo">Bit_talk</h1>
    <p class="tagline">P2P video · Open algorithm · No servers</p>
  </div>

  {#if generatedNsec}
    <!-- Backup key screen -->
    <div class="card">
      <h2>Back up your key</h2>
      <p class="desc">
        Your private key is the only way to access your account.
        If you lose it, you lose your identity permanently.
        <strong>Copy it somewhere safe before continuing.</strong>
      </p>
      <div class="key-box">
        <code>{showNsec ? generatedNsec : '•'.repeat(60)}</code>
        <div class="key-actions">
          <button class="btn-small" onclick={() => showNsec = !showNsec}>
            {showNsec ? 'Hide' : 'Reveal key'}
          </button>
          {#if showNsec}
            <button class="btn-small" onclick={() => navigator.clipboard.writeText(generatedNsec!)}>
              Copy
            </button>
          {/if}
        </div>
      </div>
      <button class="btn-primary" onclick={continueToFeed}>I've saved my key → Continue</button>
    </div>

  {:else if mode === 'choose'}
    <div class="card">
      {#if hasExtension}
        <button class="btn-primary" onclick={loginWithExtension} disabled={loading}>
          {loading ? 'Connecting…' : 'Login with browser extension'}
        </button>
        <p class="separator">or</p>
      {/if}

      <button class="btn-primary" onclick={createNewKey} disabled={loading}>
        {loading ? 'Creating…' : 'Create a new identity'}
      </button>

      <button class="btn-secondary" onclick={() => mode = 'import'}>
        Import existing nsec key
      </button>

      {#if error}
        <p class="error">{error}</p>
      {/if}
    </div>

  {:else if mode === 'import'}
    <div class="card">
      <button class="back-link" onclick={() => { mode = 'choose'; error = '' }}>← Back</button>
      <h2>Import nsec key</h2>
      <p class="desc">Paste your nsec private key below. It stays on your device.</p>
      <div class="input-wrap">
        <input
          type={showNsec ? 'text' : 'password'}
          bind:value={nsecInput}
          placeholder="nsec1…"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="none"
          spellcheck="false"
        />
        <button class="toggle-show" onclick={() => showNsec = !showNsec}>
          {showNsec ? 'Hide' : 'Show'}
        </button>
      </div>
      {#if error}
        <p class="error">{error}</p>
      {/if}
      <button
        class="btn-primary"
        onclick={importNsec}
        disabled={loading || !nsecInput.trim()}
      >
        {loading ? 'Importing…' : 'Import & login'}
      </button>
    </div>
  {/if}

  <p class="footer">
    All data stays on your device and decentralized Nostr relays.
    No accounts. No tracking. No servers.
  </p>
</div>

<style>
  .screen {
    min-height: 100dvh;
    background: #0a0a0a;
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 20px;
    gap: 28px;
  }

  .logo-area {
    text-align: center;
  }

  .logo {
    font-size: 40px;
    font-weight: 900;
    letter-spacing: -0.05em;
    margin: 0 0 8px;
  }

  .tagline {
    font-size: 14px;
    color: rgba(255,255,255,0.45);
    margin: 0;
  }

  .card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 24px 20px;
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  h2 { font-size: 20px; font-weight: 700; margin: 0; }

  .desc {
    font-size: 13px;
    color: rgba(255,255,255,0.55);
    margin: 0;
    line-height: 1.6;
  }

  .btn-primary {
    width: 100%;
    padding: 16px;
    background: #fff;
    color: #0a0a0a;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-secondary {
    width: 100%;
    padding: 16px;
    background: rgba(255,255,255,0.07);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px;
    font-size: 16px;
    cursor: pointer;
  }

  .separator {
    text-align: center;
    color: rgba(255,255,255,0.3);
    font-size: 13px;
    margin: -4px 0;
  }

  .error {
    color: #ff6b6b;
    font-size: 13px;
    margin: 0;
    text-align: center;
  }

  /* Import form */
  .back-link {
    background: none;
    border: none;
    color: rgba(255,255,255,0.5);
    font-size: 13px;
    cursor: pointer;
    padding: 0;
    text-align: left;
  }

  .input-wrap {
    position: relative;
  }

  .input-wrap input {
    width: 100%;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 14px 60px 14px 14px;
    color: #fff;
    font-size: 15px;
    outline: none;
    font-family: monospace;
    box-sizing: border-box;
  }

  .input-wrap input:focus { border-color: rgba(255,255,255,0.3); }

  .toggle-show {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: rgba(255,255,255,0.5);
    font-size: 12px;
    cursor: pointer;
  }

  /* Key backup */
  .key-box {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .key-box code {
    font-size: 11px;
    color: rgba(255,255,255,0.6);
    word-break: break-all;
    font-family: monospace;
    line-height: 1.6;
  }

  .key-actions {
    display: flex;
    gap: 8px;
  }

  .btn-small {
    background: rgba(255,255,255,0.1);
    border: none;
    color: #fff;
    border-radius: 6px;
    padding: 5px 12px;
    font-size: 12px;
    cursor: pointer;
  }

  .footer {
    font-size: 11px;
    color: rgba(255,255,255,0.25);
    text-align: center;
    max-width: 280px;
    line-height: 1.6;
    margin: 0;
  }
</style>
