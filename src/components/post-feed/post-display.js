/*
  Shared display helpers for post feed and thread views.
*/

export function formatRelativeSeen (seen) {
  if (!seen) return ''
  const ms = seen > 1e12 ? seen : seen * 1000
  const diff = Date.now() - ms
  const seconds = Math.floor(diff / 1000)

  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`

  const years = Math.floor(months / 12)
  return `${years}y`
}

export function truncateAddr (addr, maxLen = 20) {
  if (!addr || addr.length <= maxLen) return addr
  const half = Math.floor((maxLen - 3) / 2)
  return `${addr.slice(0, half)}...${addr.slice(-half)}`
}

export function truncateTxid (txid, maxLen = 20) {
  return truncateAddr(txid, maxLen)
}

export function getDisplayName (addr, profiles) {
  const profile = profiles?.[addr]
  if (profile?.name) {
    return profile.name
  }
  return truncateAddr(addr, 24)
}
