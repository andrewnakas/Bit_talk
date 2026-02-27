<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  interface LogEntry {
    level: 'log' | 'warn' | 'error' | 'info'
    msg: string
    ts: string
  }

  let open = $state(false)
  let logs = $state<LogEntry[]>([])
  let scrollEl: HTMLElement

  const origLog   = console.log.bind(console)
  const origWarn  = console.warn.bind(console)
  const origError = console.error.bind(console)
  const origInfo  = console.info.bind(console)

  function capture(level: LogEntry['level'], args: any[]) {
    const msg = args.map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a) }
      catch { return String(a) }
    }).join(' ')
    const ts = new Date().toISOString().slice(11, 23) // HH:MM:SS.mmm
    logs = [...logs, { level, msg, ts }]
    // keep last 500 lines
    if (logs.length > 500) logs = logs.slice(-500)
    // scroll to bottom after update
    setTimeout(() => { scrollEl?.scrollTo(0, scrollEl.scrollHeight) }, 0)
  }

  onMount(() => {
    console.log  = (...a) => { origLog(...a);   capture('log',   a) }
    console.warn = (...a) => { origWarn(...a);  capture('warn',  a) }
    console.error= (...a) => { origError(...a); capture('error', a) }
    console.info = (...a) => { origInfo(...a);  capture('info',  a) }

    window.addEventListener('error', onWindowError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    capture('info', ['[DebugConsole] ready'])
  })

  onDestroy(() => {
    console.log   = origLog
    console.warn  = origWarn
    console.error = origError
    console.info  = origInfo
    window.removeEventListener('error', onWindowError)
    window.removeEventListener('unhandledrejection', onUnhandledRejection)
  })

  function onWindowError(e: ErrorEvent) {
    capture('error', [`[uncaught] ${e.message} @ ${e.filename}:${e.lineno}`])
  }
  function onUnhandledRejection(e: PromiseRejectionEvent) {
    capture('error', [`[unhandledrejection] ${e.reason}`])
  }

  function copyAll() {
    const text = logs.map(l => `${l.ts} [${l.level}] ${l.msg}`).join('\n')
    navigator.clipboard.writeText(text).catch(() => {
      // fallback for older mobile browsers
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    })
  }

  function clearLogs() { logs = [] }
</script>

<!-- Toggle button — always visible in corner -->
<button
  class="toggle-btn"
  onclick={() => open = !open}
  aria-label="Toggle debug console"
>
  {open ? '✕' : '⌥'}
  {#if !open && logs.some(l => l.level === 'error')}
    <span class="err-badge"></span>
  {/if}
</button>

{#if open}
  <div class="console-panel">
    <div class="console-toolbar">
      <span class="console-title">Console ({logs.length})</span>
      <button onclick={copyAll}>Copy all</button>
      <button onclick={clearLogs}>Clear</button>
    </div>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="console-body" bind:this={scrollEl} tabindex="0">
      {#each logs as entry (entry.ts + entry.msg)}
        <div class="log-line log-{entry.level}">
          <span class="log-ts">{entry.ts}</span>
          <span class="log-msg">{entry.msg}</span>
        </div>
      {/each}
      {#if logs.length === 0}
        <div class="log-empty">No logs yet.</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .toggle-btn {
    position: fixed;
    bottom: 80px;
    left: 12px;
    z-index: 9999;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(0,0,0,0.7);
    border: 1px solid rgba(255,255,255,0.2);
    color: #fff;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 0;
    line-height: 1;
  }

  .err-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff3b30;
  }

  .console-panel {
    position: fixed;
    bottom: 124px;
    left: 8px;
    right: 8px;
    height: 55dvh;
    background: rgba(10,10,10,0.96);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 12px;
    z-index: 9998;
    display: flex;
    flex-direction: column;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 11px;
    overflow: hidden;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .console-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    flex-shrink: 0;
  }

  .console-title {
    flex: 1;
    color: rgba(255,255,255,0.6);
    font-size: 12px;
    font-weight: 600;
  }

  .console-toolbar button {
    padding: 4px 10px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 6px;
    color: #fff;
    font-size: 11px;
    cursor: pointer;
  }

  .console-body {
    flex: 1;
    overflow-y: auto;
    padding: 6px 0;
    -webkit-overflow-scrolling: touch;
  }

  .log-line {
    display: flex;
    gap: 6px;
    padding: 2px 10px;
    line-height: 1.5;
    word-break: break-all;
  }

  .log-ts {
    color: rgba(255,255,255,0.3);
    flex-shrink: 0;
    font-size: 10px;
    padding-top: 1px;
  }

  .log-msg { color: rgba(255,255,255,0.85); white-space: pre-wrap; }

  .log-warn  .log-msg { color: #ffd60a; }
  .log-warn  { background: rgba(255,214,10,0.05); }
  .log-error .log-msg { color: #ff453a; }
  .log-error { background: rgba(255,69,58,0.08); }
  .log-info  .log-msg { color: #64d2ff; }

  .log-empty {
    color: rgba(255,255,255,0.3);
    padding: 16px 12px;
    font-size: 12px;
  }
</style>
