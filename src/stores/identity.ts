import { writable, derived } from 'svelte/store'
import type { UserIdentity } from '../core/identity'
import { nip19 } from 'nostr-tools'

// Writable store — null means not yet logged in
export const identity = writable<UserIdentity | null>(null)

// Derived: true once identity is available
export const isLoggedIn = derived(identity, $id => $id !== null && $id.pk !== '')

// Derived: display name for the current user (npub shortened)
export const myNpub = derived(identity, $id => {
  if (!$id) return ''
  return nip19.npubEncode($id.pk)
})

export const myPubkey = derived(identity, $id => $id?.pk ?? '')
