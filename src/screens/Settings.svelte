<script lang="ts">
  import AlgorithmPanel from '../components/AlgorithmPanel.svelte'
  import { identity, myNpub } from '../stores/identity'
  import { loadAppSettings, saveAppSettings, DEFAULT_RELAYS, type AppSettings } from '../core/storage'
  import { navigate } from '../router'
  import { onMount } from 'svelte'
  import { nip19 } from 'nostr-tools'

  let appSettings = $state<AppSettings>({ relays: DEFAULT_RELAYS, theme: 'dark' })
  let relayInput = $state('')
  let showNsec = $state(false)
  let nsecCopied = $state(false)
  let activeTab = $state<'algorithm' | 'relays' | 'identity'>('algorithm')

  onMount(async () => {
    appSettings = await loadAppSettings()
    relayInput = appSettings.relays.join('\n')
  })

  async function saveRelays() {
    const relays = relayInput
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.startsWith('wss://'))
    appSettings = { ...appSettings, relays }
    await saveAppSettings(appSettings)
    alert('Relays saved. Reload the app to reconnect.')
  }

  function resetRelays() {
    relayInput = DEFAULT_RELAYS.join('\n')
  }

  async function copyNsec() {
    if (!$identity?.nsec) return
    await navigator.clipboard.writeText($identity.nsec)
    nsecCopied = true
    setTimeout(() => nsecCopied = false, 2000)
  }

  function copyNpub() {
    if (!$myNpub) return
    navigator.clipboard.writeText($myNpub)
  }
</script>

<div class="screen">
  <header class="header">
    <h1>Settings</h1>
  </header>

  <!-- Tab switcher -->
  <div class="tabs">
    <button class="tab" class:active={activeTab === 'algorithm'} onclick={() => activeTab = 'algorithm'}>
      Algorithm
    </button>
    <button class="tab" class:active={activeTab === 'relays'} onclick={() => activeTab = 'relays'}>
      Relays
    </button>
    <button class="tab" class:active={activeTab === 'identity'} onclick={() => activeTab = 'identity'}>
      Identity
    </button>
  </div>

  <div class="tab-content">
    {#if activeTab === 'algorithm'}
      <AlgorithmPanel />

    {:else if activeTab === 'relays'}
      <div class="section">
        <h2>Nostr Relays</h2>
        <p class="desc">
          Relays are community-run servers that store and forward Nostr events.
          Your video metadata, likes, follows, and comments all travel through these.
          The more relays you connect to, the more resilient and reachable you are.
        </p>
        <textarea
          bind:value={relayInput}
          rows="8"
          placeholder="wss://relay.example.com"
          spellcheck="false"
        ></textarea>
        <p class="hint">One relay URL per line. Must start with wss://</p>
        <div class="btn-row">
          <button class="btn-secondary" onclick={resetRelays}>Reset to defaults</button>
          <button class="btn-primary" onclick={saveRelays}>Save relays</button>
        </div>

        <div class="info-box">
          <h3>Recommended public relays</h3>
          {#each DEFAULT_RELAYS as relay}
            <p class="relay-item">{relay}</p>
          {/each}
        </div>
      </div>

    {:else if activeTab === 'identity'}
      <div class="section">
        <h2>Your Identity</h2>
        <p class="desc">
          Your identity is a cryptographic keypair stored entirely on your device.
          There is no account, no email, no password — just your keys.
          Back up your private key (nsec) somewhere safe.
        </p>

        {#if $identity}
          <div class="key-box">
            <span class="key-label">Public key (npub)</span>
            <div class="key-row">
              <code class="key-value">{$myNpub}</code>
              <button class="copy-btn" onclick={copyNpub}>Copy</button>
            </div>
            <p class="key-hint">Share this with others so they can follow you.</p>
          </div>

          {#if $identity.nsec}
            <div class="key-box danger-box">
              <span class="key-label">Private key (nsec)</span>
              <div class="key-row">
                <code class="key-value">
                  {showNsec ? $identity.nsec : '•'.repeat(40)}
                </code>
                <button class="copy-btn" onclick={() => showNsec = !showNsec}>
                  {showNsec ? 'Hide' : 'Show'}
                </button>
                {#if showNsec}
                  <button class="copy-btn" onclick={copyNsec}>
                    {nsecCopied ? 'Copied!' : 'Copy'}
                  </button>
                {/if}
              </div>
              <p class="key-hint danger-hint">
                Never share this. Anyone with your nsec has full control of your account.
                Back it up offline.
              </p>
            </div>
          {:else}
            <div class="info-box">
              <p>You are logged in via a browser extension (NIP-07). Your private key is managed by the extension.</p>
            </div>
          {/if}
        {:else}
          <div class="state-center">
            <p>Not logged in.</p>
            <button class="btn-primary" onclick={() => navigate('login')}>Log in</button>
          </div>
        {/if}

        <div class="about-section">
          <h3>About Bit_talk</h3>
          <p>
            Bit_talk is a fully decentralized peer-to-peer video sharing app.
            No central server. No company owns your content or your algorithm.
          </p>
          <p>
            Built on: <strong>Nostr</strong> (social protocol) +
            <strong>WebTorrent</strong> (P2P video) +
            <strong>Svelte</strong> (UI)
          </p>
          <a
            href="https://github.com/andrewnakas/Bit_talk"
            target="_blank"
            rel="noopener"
            class="github-link"
          >
            View source on GitHub →
          </a>
        </div>
      </div>
    {/if}
  </div>
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
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }

  h1 { font-size: 22px; font-weight: 800; margin: 0; }

  /* Tabs */
  .tabs {
    display: flex;
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }

  .tab {
    flex: 1;
    background: none;
    border: none;
    color: rgba(255,255,255,0.5);
    font-size: 14px;
    font-weight: 600;
    padding: 14px 8px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab.active {
    color: #fff;
    border-bottom-color: #fff;
  }

  .tab-content { overflow-y: auto; }

  /* Sections */
  .section {
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  h2 { font-size: 18px; font-weight: 700; margin: 0; }
  h3 { font-size: 14px; font-weight: 700; margin: 0 0 8px; color: rgba(255,255,255,0.7); }

  .desc {
    font-size: 13px;
    color: rgba(255,255,255,0.5);
    margin: 0;
    line-height: 1.6;
  }

  textarea {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 12px 14px;
    color: #fff;
    font-size: 13px;
    font-family: monospace;
    outline: none;
    resize: vertical;
    line-height: 1.7;
  }

  .hint {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    margin: -8px 0 0;
  }

  .btn-row {
    display: flex;
    gap: 10px;
  }

  .btn-primary {
    flex: 1;
    padding: 12px;
    background: #fff;
    color: #0a0a0a;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }

  .btn-secondary {
    flex: 1;
    padding: 12px;
    background: rgba(255,255,255,0.08);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    font-size: 14px;
    cursor: pointer;
  }

  .info-box {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 14px;
  }

  .relay-item {
    font-size: 12px;
    color: rgba(255,255,255,0.5);
    font-family: monospace;
    margin: 4px 0;
  }

  /* Identity */
  .key-box {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .danger-box {
    border-color: rgba(255, 80, 80, 0.25);
    background: rgba(255, 80, 80, 0.04);
  }

  .key-label {
    font-size: 11px;
    font-weight: 700;
    color: rgba(255,255,255,0.5);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .key-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .key-value {
    font-size: 11px;
    color: rgba(255,255,255,0.6);
    font-family: monospace;
    word-break: break-all;
    flex: 1;
  }

  .copy-btn {
    background: rgba(255,255,255,0.1);
    border: none;
    color: #fff;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }

  .key-hint {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    margin: 0;
    line-height: 1.5;
  }

  .danger-hint { color: rgba(255, 120, 120, 0.7); }

  .state-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 32px;
    text-align: center;
  }

  .about-section {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .about-section p {
    font-size: 13px;
    color: rgba(255,255,255,0.5);
    margin: 0;
    line-height: 1.5;
  }

  .github-link {
    color: rgba(255,255,255,0.6);
    font-size: 13px;
    text-decoration: none;
  }

  .github-link:hover { color: #fff; }
</style>
