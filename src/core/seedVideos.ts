// Public-domain seed videos served via Google Cloud Storage sample bucket.
// directURL gives VideoPlayer a reliable HTTP stream so playback never depends
// on WebTorrent peer availability. The magnetURI is kept so the video can still
// be re-shared over P2P once peers appear.
//
// Licenses: CC BY 3.0 — Blender Foundation / blender.org
//           "For Bigger Blazes" — Google sample video (free to use)

import type { StoredVideo } from './storage'

// Deterministic demo pubkey — not a real Nostr user
const SEED_PUBKEY = '0000000000000000000000000000000000000000000000000000000000000001'

const GCS = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample'

const now = Math.floor(Date.now() / 1000)

export const SEED_VIDEOS: StoredVideo[] = [
  {
    eventId: 'seed-big-buck-bunny',
    pubkey: SEED_PUBKEY,
    title: 'Big Buck Bunny',
    summary: 'A large and loveable bunny is tormented by a trio of rodents. Short animated film by the Blender Foundation. (CC BY 3.0)',
    magnetURI:
      'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c' +
      '&dn=Big+Buck+Bunny' +
      '&tr=wss%3A%2F%2Ftracker.btorrent.xyz' +
      '&tr=wss%3A%2F%2Ftracker.openwebtorrent.com' +
      '&tr=wss%3A%2F%2Ftracker.webtorrent.dev',
    directURL: `${GCS}/BigBuckBunny.mp4`,
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/220px-Big_buck_bunny_poster_big.jpg',
    duration: 596,
    hashtags: ['animation', 'blender', 'publicdomain', 'shortfilm'],
    createdAt: now - 86400 * 3,
    cachedAt: Date.now(),
  },
  {
    eventId: 'seed-elephants-dream',
    pubkey: SEED_PUBKEY,
    title: "Elephant's Dream",
    summary: "The world's first open movie, made entirely with open-source software. Two robots explore a surreal mechanical world. (CC BY 2.5)",
    magnetURI:
      'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d' +
      '&dn=Elephants+Dream' +
      '&tr=wss%3A%2F%2Ftracker.btorrent.xyz' +
      '&tr=wss%3A%2F%2Ftracker.openwebtorrent.com' +
      '&tr=wss%3A%2F%2Ftracker.webtorrent.dev',
    directURL: `${GCS}/ElephantsDream.mp4`,
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Elephants_Dream_s5_both.jpg/320px-Elephants_Dream_s5_both.jpg',
    duration: 654,
    hashtags: ['animation', 'blender', 'publicdomain', 'opensource'],
    createdAt: now - 86400 * 2,
    cachedAt: Date.now(),
  },
  {
    eventId: 'seed-tears-of-steel',
    pubkey: SEED_PUBKEY,
    title: 'Tears of Steel',
    summary: 'Warriors and machines fight over the fate of humanity. Mango Open Movie Project. (CC BY 3.0)',
    magnetURI:
      'magnet:?xt=urn:btih:209c8226b299b308beaf2b9cd3fb49212dbd13ec' +
      '&dn=Tears+of+Steel' +
      '&tr=wss%3A%2F%2Ftracker.btorrent.xyz' +
      '&tr=wss%3A%2F%2Ftracker.openwebtorrent.com' +
      '&tr=wss%3A%2F%2Ftracker.webtorrent.dev',
    directURL: `${GCS}/TearsOfSteel.mp4`,
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Tears_of_Steel_poster.jpg/220px-Tears_of_Steel_poster.jpg',
    duration: 734,
    hashtags: ['scifi', 'blender', 'publicdomain', 'shortfilm'],
    createdAt: now - 86400,
    cachedAt: Date.now(),
  },
  {
    eventId: 'seed-for-bigger-blazes',
    pubkey: SEED_PUBKEY,
    title: 'For Bigger Blazes',
    summary: 'Sample HD video — blazing action demo clip.',
    magnetURI:
      'magnet:?xt=urn:btih:0000000000000000000000000000000000000001' +
      '&dn=For+Bigger+Blazes' +
      '&tr=wss%3A%2F%2Ftracker.openwebtorrent.com',
    directURL: `${GCS}/ForBiggerBlazes.mp4`,
    thumbnail: '',
    duration: 15,
    hashtags: ['demo', 'action', 'sample'],
    createdAt: now,
    cachedAt: Date.now(),
  },
]
