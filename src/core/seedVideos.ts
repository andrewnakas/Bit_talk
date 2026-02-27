// Public domain seed videos from the Blender Foundation Open Movie Project.
// These use WebSocket trackers (wss://) for browser-based WebTorrent streaming,
// and include web seeds (ws=) hosted by webtorrent.io so playback starts even
// before P2P peers are discovered.
//
// Licenses: CC BY 3.0 / CC BY 4.0 — Blender Foundation / blender.org

import type { StoredVideo } from './storage'

// Deterministic demo pubkey — not a real Nostr user
const SEED_PUBKEY = '0000000000000000000000000000000000000000000000000000000000000001'

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
      '&tr=wss%3A%2F%2Ftracker.webtorrent.dev' +
      '&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F' +
      '&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fbig-buck-bunny.torrent',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/220px-Big_buck_bunny_poster_big.jpg',
    duration: 596,
    hashtags: ['animation', 'blender', 'publicdomain', 'shortfilm'],
    createdAt: now - 86400 * 3,
    cachedAt: Date.now(),
  },
  {
    eventId: 'seed-sintel',
    pubkey: SEED_PUBKEY,
    title: 'Sintel',
    summary: 'A lonely young woman befriends a baby dragon, only to have it taken away. Short film by Blender Foundation. (CC BY 3.0)',
    magnetURI:
      'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10' +
      '&dn=Sintel' +
      '&tr=wss%3A%2F%2Ftracker.btorrent.xyz' +
      '&tr=wss%3A%2F%2Ftracker.openwebtorrent.com' +
      '&tr=wss%3A%2F%2Ftracker.webtorrent.dev' +
      '&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F' +
      '&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Sintel-2010.jpg/220px-Sintel-2010.jpg',
    duration: 888,
    hashtags: ['animation', 'blender', 'publicdomain', 'fantasy'],
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
      '&tr=wss%3A%2F%2Ftracker.webtorrent.dev' +
      '&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F' +
      '&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Ftears-of-steel.torrent',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Tears_of_Steel_poster.jpg/220px-Tears_of_Steel_poster.jpg',
    duration: 734,
    hashtags: ['scifi', 'blender', 'publicdomain', 'shortfilm'],
    createdAt: now - 86400,
    cachedAt: Date.now(),
  },
  {
    eventId: 'seed-cosmos-laundromat',
    pubkey: SEED_PUBKEY,
    title: 'Cosmos Laundromat',
    summary: 'A sheep named Franck meets a mysterious figure on a desolate island. Blender Foundation. (CC BY 4.0)',
    magnetURI:
      'magnet:?xt=urn:btih:c9e15763f722f23e98a29decdfae341b98d53056' +
      '&dn=Cosmos+Laundromat' +
      '&tr=wss%3A%2F%2Ftracker.btorrent.xyz' +
      '&tr=wss%3A%2F%2Ftracker.openwebtorrent.com' +
      '&tr=wss%3A%2F%2Ftracker.webtorrent.dev' +
      '&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F' +
      '&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fcosmos-laundromat.torrent',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/CosmosLaundromatPoster.jpg/220px-CosmosLaundromatPoster.jpg',
    duration: 1262,
    hashtags: ['animation', 'blender', 'publicdomain', 'surreal'],
    createdAt: now,
    cachedAt: Date.now(),
  },
]
