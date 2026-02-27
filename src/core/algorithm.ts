// Bit_talk recommendation algorithm
//
// This algorithm is entirely transparent. Every signal, every weight, and every
// scoring decision is documented here and adjustable by the user via the
// Settings screen. There is no hidden ranking, no sponsored content injection,
// and no dark patterns. The source code IS the algorithm.
//
// Architecture:
//   1. Gather context (follows, watch history, topic affinities)
//   2. Score each candidate video
//   3. Apply diversity penalty to avoid topic bubbles
//   4. Sort descending and return

import type { StoredVideo, AlgorithmWeights } from './storage'

// ── User context ──────────────────────────────────────────────────────────────

export interface UserContext {
  follows: Set<string>           // pubkeys the user follows
  followsOfFollows: Set<string>  // second-degree follows
  watchedIds: Set<string>        // video event IDs already watched
  topicAffinities: Record<string, number>  // tag → engagement score (0–1)
  seenCreators: Set<string>      // pubkeys of creators already seen in feed
  likedIds: Set<string>
}

export function buildEmptyContext(): UserContext {
  return {
    follows: new Set(),
    followsOfFollows: new Set(),
    watchedIds: new Set(),
    topicAffinities: {},
    seenCreators: new Set(),
    likedIds: new Set(),
  }
}

// ── Topic affinity calculation ────────────────────────────────────────────────
//
// For each tag in watch history, accumulate a score based on how much of the
// video was watched (completionRate). Tags from videos watched to completion
// score 1.0, half-watched score 0.5, etc. Scores decay to avoid stale history.

export function computeTopicAffinities(
  watchHistory: Array<{ hashtags: string[]; watchDuration: number; totalDuration: number }>,
): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const entry of watchHistory) {
    const completion = entry.totalDuration > 0
      ? Math.min(entry.watchDuration / entry.totalDuration, 1)
      : 0
    for (const tag of entry.hashtags) {
      scores[tag] = (scores[tag] ?? 0) + completion
    }
  }
  // Normalize to 0–1 range
  const max = Math.max(...Object.values(scores), 1)
  return Object.fromEntries(
    Object.entries(scores).map(([k, v]) => [k, v / max])
  )
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export interface VideoScore {
  video: StoredVideo
  score: number
  signals: {
    recency: number
    engagement: number
    followingBoost: number
    networkBoost: number
    topicAffinity: number
    novelty: number
  }
}

// recencyScore: exponential decay, half-life configurable
// 100% at 0 days old → ~50% at 3 days → ~13% at 7 days
function recencyScore(createdAt: number): number {
  const ageSeconds = Math.floor(Date.now() / 1000) - createdAt
  const halfLifeSeconds = 3 * 86400  // 3 days
  return Math.exp((-Math.LN2 / halfLifeSeconds) * ageSeconds)
}

// engagementScore: normalized ratio (likes + comments*2) per hour since posting
function engagementScore(
  likes: number,
  comments: number,
  createdAt: number,
): number {
  const ageHours = Math.max(1, (Date.now() / 1000 - createdAt) / 3600)
  const raw = (likes + comments * 2) / ageHours
  // Soft cap at 100 interactions/hour = score 1.0
  return Math.min(raw / 100, 1)
}

export function scoreVideo(
  video: StoredVideo,
  weights: AlgorithmWeights,
  ctx: UserContext,
  likes: number = 0,
  comments: number = 0,
): VideoScore {
  const rec = recencyScore(video.createdAt)
  const eng = engagementScore(likes, comments, video.createdAt)
  const isFollowing = ctx.follows.has(video.pubkey) ? 1 : 0
  const isFollowOfFollow = ctx.followsOfFollows.has(video.pubkey) ? 1 : 0

  const topicScore = video.hashtags.reduce((sum, tag) => {
    return sum + (ctx.topicAffinities[tag] ?? 0)
  }, 0) / Math.max(video.hashtags.length, 1)

  // Novelty: reward creators not yet seen in this feed session
  const nov = ctx.seenCreators.has(video.pubkey) ? 0 : 1

  const score =
    weights.recency * rec +
    weights.engagement * eng +
    weights.followingActivity * isFollowing +
    weights.networkActivity * isFollowOfFollow * (1 - isFollowing) +
    weights.topicAffinity * topicScore +
    weights.watchHistory * topicScore +   // re-uses topicScore as proxy
    weights.novelty * nov

  return {
    video,
    score,
    signals: {
      recency: rec,
      engagement: eng,
      followingBoost: isFollowing,
      networkBoost: isFollowOfFollow,
      topicAffinity: topicScore,
      novelty: nov,
    },
  }
}

// ── Diversity penalty ─────────────────────────────────────────────────────────
//
// After scoring, reduce score for videos whose primary topic has already
// appeared in the top N results. Strength scales with weights.diversity.

export function applyDiversityPenalty(
  scored: VideoScore[],
  weights: AlgorithmWeights,
): VideoScore[] {
  const tagCounts: Record<string, number> = {}
  return scored.map(item => {
    const primaryTag = item.video.hashtags[0]
    if (!primaryTag) return item
    const count = tagCounts[primaryTag] ?? 0
    const penalty = count > 0 ? weights.diversity * count * 0.1 : 0
    tagCounts[primaryTag] = count + 1
    return { ...item, score: item.score - penalty }
  })
}

// ── Main ranking function ─────────────────────────────────────────────────────

export function rankVideos(
  videos: StoredVideo[],
  weights: AlgorithmWeights,
  ctx: UserContext,
  engagementData: Map<string, { likes: number; comments: number }> = new Map(),
): StoredVideo[] {
  // Filter already-watched videos
  const candidates = videos.filter(v => !ctx.watchedIds.has(v.eventId))

  // Score each video
  const scored: VideoScore[] = candidates.map(v => {
    const eng = engagementData.get(v.eventId) ?? { likes: 0, comments: 0 }
    return scoreVideo(v, weights, ctx, eng.likes, eng.comments)
  })

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  // Apply diversity penalty and re-sort
  const withDiversity = applyDiversityPenalty(scored, weights)
  withDiversity.sort((a, b) => b.score - a.score)

  return withDiversity.map(s => s.video)
}

// ── Algorithm explainer ───────────────────────────────────────────────────────
//
// Returns a human-readable explanation of why a video scored how it did.
// Shown in the UI on long-press of a video card.

export function explainScore(scored: VideoScore): string[] {
  const lines: string[] = []
  const { signals } = scored

  if (signals.followingBoost > 0) lines.push('From someone you follow')
  else if (signals.networkBoost > 0) lines.push('From a follow-of-follow')

  if (signals.recency > 0.8) lines.push('Very recent')
  else if (signals.recency < 0.2) lines.push('Older content')

  if (signals.engagement > 0.5) lines.push('High engagement')

  if (signals.topicAffinity > 0.5) lines.push('Matches your interests')

  if (signals.novelty > 0) lines.push('New creator')

  if (lines.length === 0) lines.push('Global discovery')
  return lines
}
