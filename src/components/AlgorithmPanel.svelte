<script lang="ts">
  import { algorithmWeights, persistWeights, resetWeights } from '../stores/algorithm'
  import type { AlgorithmWeights } from '../core/storage'

  let weights = $state<AlgorithmWeights>({ ...$algorithmWeights })

  // Keep local state in sync with store
  algorithmWeights.subscribe(w => { weights = { ...w } })

  const labels: Record<keyof AlgorithmWeights, { label: string; description: string }> = {
    recency: {
      label: 'Recency',
      description: 'Boosts newer videos. High = only see recent. Low = timeless content.',
    },
    engagement: {
      label: 'Engagement',
      description: 'Boosts videos with more likes and comments relative to age.',
    },
    followingActivity: {
      label: 'Following',
      description: 'Boosts videos from people you follow. High = mostly followed creators.',
    },
    networkActivity: {
      label: 'Network',
      description: 'Boosts videos from follows-of-follows — expands your social circle.',
    },
    watchHistory: {
      label: 'Watch History',
      description: 'Boosts videos similar to what you have watched before.',
    },
    topicAffinity: {
      label: 'Topics',
      description: 'Boosts videos tagged with topics you engage with.',
    },
    novelty: {
      label: 'Novelty',
      description: 'Boosts creators you have never seen. High = always new faces.',
    },
    diversity: {
      label: 'Diversity',
      description: 'Prevents topic bubbles. High = mix of different topics.',
    },
  }

  async function handleChange(key: keyof AlgorithmWeights, value: number) {
    weights = { ...weights, [key]: value }
    await persistWeights(weights)
  }

  async function handleReset() {
    await resetWeights()
  }

  function exportWeights() {
    const json = JSON.stringify(weights, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bittalk-algorithm.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importWeights(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      await persistWeights(parsed)
    } catch {
      alert('Invalid algorithm file')
    }
  }
</script>

<div class="panel">
  <div class="panel-header">
    <h2>Your Algorithm</h2>
    <p class="subtitle">
      Every weight here is visible, auditable, and yours to control.
      No hidden signals. No sponsored content. No dark patterns.
    </p>
  </div>

  <div class="sliders">
    {#each Object.keys(labels) as key (key)}
      {@const k = key as keyof AlgorithmWeights}
      {@const meta = labels[k]}
      <div class="slider-row">
        <div class="slider-header">
          <span class="slider-label">{meta.label}</span>
          <span class="slider-value">{Math.round(weights[k] * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={weights[k]}
          oninput={(e) => handleChange(k, parseFloat((e.target as HTMLInputElement).value))}
          aria-label={meta.label}
        />
        <p class="slider-desc">{meta.description}</p>
      </div>
    {/each}
  </div>

  <div class="actions">
    <button class="btn-secondary" onclick={handleReset}>Reset to defaults</button>
    <button class="btn-secondary" onclick={exportWeights}>Export</button>
    <label class="btn-secondary" for="import-weights">Import</label>
    <input
      id="import-weights"
      type="file"
      accept=".json"
      onchange={importWeights}
      style="display:none"
    />
  </div>

  <div class="transparency-note">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:16px;height:16px;flex-shrink:0">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
      <path d="M12 16v-4m0-4h.01"/>
    </svg>
    <span>
      The algorithm runs entirely in your browser. Your watch history and settings
      never leave your device. You can view the source code on
      <a href="https://github.com/andrewnakas/Bit_talk" target="_blank" rel="noopener">GitHub</a>.
    </span>
  </div>
</div>

<style>
  .panel {
    padding: 20px 16px 40px;
    color: #fff;
  }

  .panel-header {
    margin-bottom: 28px;
  }

  h2 {
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 8px;
    letter-spacing: -0.03em;
  }

  .subtitle {
    font-size: 13px;
    color: rgba(255,255,255,0.55);
    margin: 0;
    line-height: 1.5;
  }

  .sliders {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .slider-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .slider-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .slider-label {
    font-size: 15px;
    font-weight: 600;
  }

  .slider-value {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: rgba(255,255,255,0.6);
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,0.15);
    outline: none;
    cursor: pointer;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
    transition: transform 0.1s;
  }

  input[type="range"]:active::-webkit-slider-thumb {
    transform: scale(1.2);
  }

  input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    border: none;
    cursor: pointer;
  }

  .slider-desc {
    font-size: 12px;
    color: rgba(255,255,255,0.4);
    margin: 0;
    line-height: 1.4;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 32px;
  }

  .btn-secondary {
    padding: 8px 18px;
    border-radius: 20px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15);
    color: #fff;
    font-size: 13px;
    cursor: pointer;
    text-align: center;
    transition: background 0.15s;
  }

  .btn-secondary:hover {
    background: rgba(255,255,255,0.18);
  }

  .transparency-note {
    margin-top: 28px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 12px;
    color: rgba(255,255,255,0.4);
    line-height: 1.5;
    padding: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
  }

  .transparency-note a {
    color: rgba(255,255,255,0.7);
    text-decoration: underline;
  }
</style>
