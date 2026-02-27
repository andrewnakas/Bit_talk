import {
  generateSecretKey,
  getPublicKey,
  nip19,
} from 'nostr-tools'
import { loadIdentity, saveIdentity, type StoredIdentity } from './storage'

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserIdentity {
  sk: Uint8Array
  pk: string        // hex pubkey
  npub: string      // bech32 npub
  nsec: string      // bech32 nsec (for display/export)
}

// ── NIP-07 browser extension detection ───────────────────────────────────────

export function hasNip07Extension(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).nostr !== 'undefined'
}

export async function loginWithNip07(): Promise<UserIdentity | null> {
  if (!hasNip07Extension()) return null
  try {
    const pk = await (window as any).nostr.getPublicKey()
    return {
      sk: new Uint8Array(0),   // NIP-07: private key stays in extension
      pk,
      npub: nip19.npubEncode(pk),
      nsec: '',
    }
  } catch {
    return null
  }
}

// ── Key generation and persistence ───────────────────────────────────────────

export function generateIdentity(): UserIdentity {
  const sk = generateSecretKey()
  const pk = getPublicKey(sk)
  return {
    sk,
    pk,
    npub: nip19.npubEncode(pk),
    nsec: nip19.nsecEncode(sk),
  }
}

export async function loadOrCreateIdentity(): Promise<UserIdentity> {
  const stored: StoredIdentity | undefined = await loadIdentity()
  if (stored) {
    const sk = hexToBytes(stored.sk)
    const pk = stored.pk
    return {
      sk,
      pk,
      npub: nip19.npubEncode(pk),
      nsec: nip19.nsecEncode(sk),
    }
  }
  const identity = generateIdentity()
  await persistIdentity(identity)
  return identity
}

export async function persistIdentity(identity: UserIdentity): Promise<void> {
  if (identity.sk.length === 0) return  // NIP-07 users: key lives in extension
  await saveIdentity({
    sk: bytesToHex(identity.sk),
    pk: identity.pk,
    createdAt: Date.now(),
  })
}

// ── nsec import ──────────────────────────────────────────────────────────────

export function importFromNsec(nsecStr: string): UserIdentity | null {
  try {
    const decoded = nip19.decode(nsecStr)
    if (decoded.type !== 'nsec') return null
    const sk = decoded.data as Uint8Array
    const pk = getPublicKey(sk)
    return {
      sk,
      pk,
      npub: nip19.npubEncode(pk),
      nsec: nsecStr,
    }
  } catch {
    return null
  }
}

// ── Hex utilities ─────────────────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return arr
}
