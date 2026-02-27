<script lang="ts">
  import { seedFile, captureThumbnail, getVideoMeta } from '../core/torrent'
  import { publishVideo } from '../core/nostr'
  import { identity } from '../stores/identity'
  import { navigate } from '../router'

  type UploadStep = 'pick' | 'preview' | 'seeding' | 'publishing' | 'done' | 'error'

  let step = $state<UploadStep>('pick')
  let selectedFile = $state<File | null>(null)
  let thumbnail = $state<string | null>(null)
  let previewURL = $state<string | null>(null)
  let title = $state('')
  let description = $state('')
  let hashtags = $state('')
  let seedProgress = $state(0)
  let errorMsg = $state('')
  let magnetURI = $state('')

  let fileInputEl: HTMLInputElement = $state(null as any)

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      errorMsg = 'Please select a video file'
      step = 'error'
      return
    }
    if (file.size > 500 * 1024 * 1024) {
      errorMsg = 'Video must be under 500 MB'
      step = 'error'
      return
    }
    selectedFile = file
    previewURL = URL.createObjectURL(file)
    title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    step = 'preview'
    captureThumbnail(file).then(t => { thumbnail = t }).catch(() => {})
  }

  function reset() {
    if (previewURL) URL.revokeObjectURL(previewURL)
    selectedFile = null
    thumbnail = null
    previewURL = null
    title = ''
    description = ''
    hashtags = ''
    seedProgress = 0
    errorMsg = ''
    magnetURI = ''
    step = 'pick'
  }

  async function handlePublish() {
    if (!selectedFile || !$identity) return
    if (!title.trim()) {
      errorMsg = 'Please add a title'
      return
    }

    step = 'seeding'
    seedProgress = 0

    try {
      // 1. Get video metadata
      const meta = await getVideoMeta(selectedFile).catch(() => null)

      // 2. Seed via WebTorrent
      const result = await seedFile(selectedFile, state => {
        seedProgress = state.progress
      })
      magnetURI = result.magnetURI

      // 3. Publish Nostr event
      step = 'publishing'
      const tags = hashtags.split(/[\s,#]+/).filter(Boolean)

      await publishVideo({
        title: title.trim(),
        summary: description.trim(),
        magnetURI: result.magnetURI,
        thumbnail: thumbnail ?? undefined,
        duration: meta?.duration,
        dimensions: meta ? `${meta.width}x${meta.height}` : undefined,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        hashtags: tags,
      })

      step = 'done'
    } catch (err: any) {
      errorMsg = err?.message ?? 'Upload failed'
      step = 'error'
    }
  }
</script>

<div class="screen">
  <header class="header">
    <button class="back-btn" onclick={() => navigate('feed')} aria-label="Back">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
    </button>
    <h1>New Video</h1>
  </header>

  <div class="content">
    {#if step === 'pick'}
      <label class="drop-zone" for="file-pick">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:.5">
          <path d="M7 16a4 4 0 0 1-.88-7.903A5 5 0 1 1 15.9 6L16 6a5 5 0 0 1 1 9.9M15 13l-3-3m0 0-3 3m3-3v12"/>
        </svg>
        <p>Tap to select a video</p>
        <span class="hint">MP4 or WebM · max 500 MB</span>
        <input
          id="file-pick"
          bind:this={fileInputEl}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onchange={handleFileChange}
          style="display:none"
        />
      </label>

    {:else if step === 'preview'}
      <div class="preview-layout">
        <div class="preview-video-wrap">
          {#if thumbnail}
            <img src={thumbnail} alt="Thumbnail" class="thumbnail-preview" />
          {:else}
            <video src={previewURL} class="preview-video" muted playsinline controls></video>
          {/if}
        </div>

        <div class="form">
          <div class="field">
            <label for="title">Title *</label>
            <input
              id="title"
              type="text"
              bind:value={title}
              maxlength="100"
              placeholder="What's this video about?"
            />
          </div>

          <div class="field">
            <label for="desc">Description</label>
            <textarea
              id="desc"
              bind:value={description}
              maxlength="500"
              rows="3"
              placeholder="Optional caption…"
            ></textarea>
          </div>

          <div class="field">
            <label for="tags">Hashtags</label>
            <input
              id="tags"
              type="text"
              bind:value={hashtags}
              placeholder="#funny #art #music"
            />
            <span class="hint">Separate with spaces or commas</span>
          </div>

          {#if errorMsg}
            <p class="error-msg">{errorMsg}</p>
          {/if}

          <div class="btn-row">
            <button class="btn-cancel" onclick={reset}>Cancel</button>
            <button
              class="btn-publish"
              onclick={handlePublish}
              disabled={!title.trim()}
            >
              Publish
            </button>
          </div>
        </div>
      </div>

    {:else if step === 'seeding'}
      <div class="progress-screen">
        <div class="progress-label">Seeding to P2P network…</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar" style="width: {Math.round(seedProgress * 100)}%"></div>
        </div>
        <p class="progress-note">
          Your video is being shared directly from your device.<br />
          Keep this tab open while uploading.
        </p>
      </div>

    {:else if step === 'publishing'}
      <div class="progress-screen">
        <div class="spinner"></div>
        <p>Publishing to Nostr…</p>
      </div>

    {:else if step === 'done'}
      <div class="done-screen">
        <div class="check-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        </div>
        <h2>Video published!</h2>
        <p class="done-note">
          Your video is live on the Nostr network. Share the magnet link so
          others can seed it and keep it alive.
        </p>
        <div class="magnet-box">
          <code>{magnetURI.slice(0, 80)}…</code>
          <button onclick={() => navigator.clipboard.writeText(magnetURI)}>Copy</button>
        </div>
        <div class="done-actions">
          <button class="btn-publish" onclick={() => navigate('feed')}>View Feed</button>
          <button class="btn-cancel" onclick={reset}>Upload another</button>
        </div>
      </div>

    {:else if step === 'error'}
      <div class="progress-screen">
        <p class="error-msg large">{errorMsg}</p>
        <button class="btn-cancel" onclick={reset}>Try again</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .screen {
    min-height: 100dvh;
    background: #0a0a0a;
    color: #fff;
    display: flex;
    flex-direction: column;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }

  .back-btn {
    background: none;
    border: none;
    color: #fff;
    cursor: pointer;
    padding: 4px;
  }

  .back-btn svg { width: 20px; height: 20px; display: block; }

  h1 { font-size: 18px; font-weight: 700; margin: 0; }

  .content {
    flex: 1;
    padding: 20px 16px 100px;
  }

  /* Drop zone */
  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border: 2px dashed rgba(255,255,255,0.15);
    border-radius: 16px;
    padding: 60px 24px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    color: #fff;
  }

  .drop-zone:hover, .drop-zone:active {
    border-color: rgba(255,255,255,0.4);
    background: rgba(255,255,255,0.03);
  }

  .drop-zone p { font-size: 17px; font-weight: 600; margin: 0; }
  .hint { font-size: 12px; color: rgba(255,255,255,0.4); }

  /* Preview */
  .preview-layout {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .preview-video-wrap {
    width: 100%;
    max-height: 260px;
    border-radius: 12px;
    overflow: hidden;
    background: #111;
  }

  .thumbnail-preview, .preview-video {
    width: 100%;
    height: 260px;
    object-fit: cover;
  }

  /* Form */
  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.7);
  }

  input, textarea {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 12px 14px;
    color: #fff;
    font-size: 15px;
    outline: none;
    transition: border-color 0.15s;
    font-family: inherit;
    resize: vertical;
  }

  input:focus, textarea:focus {
    border-color: rgba(255,255,255,0.35);
  }

  input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }

  .btn-row {
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

  .btn-publish {
    flex: 2;
    padding: 14px;
    background: #fff;
    border: none;
    color: #0a0a0a;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-publish:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  /* Progress screens */
  .progress-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    gap: 16px;
    text-align: center;
  }

  .progress-label {
    font-size: 16px;
    font-weight: 600;
  }

  .progress-bar-wrap {
    width: 100%;
    max-width: 300px;
    height: 4px;
    background: rgba(255,255,255,0.12);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: #fff;
    border-radius: 2px;
    transition: width 0.3s;
  }

  .progress-note {
    font-size: 13px;
    color: rgba(255,255,255,0.5);
    max-width: 280px;
    line-height: 1.6;
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

  /* Done screen */
  .done-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding-top: 40px;
    text-align: center;
  }

  .check-icon {
    width: 64px;
    height: 64px;
    background: rgba(255,255,255,0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .check-icon svg { width: 30px; height: 30px; }

  .done-screen h2 { font-size: 22px; font-weight: 700; margin: 0; }

  .done-note {
    font-size: 13px;
    color: rgba(255,255,255,0.5);
    max-width: 280px;
    line-height: 1.6;
    margin: 0;
  }

  .magnet-box {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    max-width: 340px;
  }

  .magnet-box code {
    font-size: 10px;
    color: rgba(255,255,255,0.5);
    word-break: break-all;
    flex: 1;
  }

  .magnet-box button {
    background: rgba(255,255,255,0.1);
    border: none;
    color: #fff;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }

  .done-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    max-width: 320px;
  }

  .error-msg {
    color: #ff4d6d;
    font-size: 13px;
    margin: 0;
  }

  .error-msg.large { font-size: 16px; }
</style>
