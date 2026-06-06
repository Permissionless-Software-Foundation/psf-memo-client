/*
  Single post node in a reply thread (recursive).
*/

import React from 'react'
import { Link } from 'react-router-dom'

import PostThreadAvatar from './post-thread-avatar'

function formatRelativeSeen (seen) {
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

function truncateAddr (addr, maxLen = 20) {
  if (!addr || addr.length <= maxLen) return addr
  const half = Math.floor((maxLen - 3) / 2)
  return `${addr.slice(0, half)}...${addr.slice(-half)}`
}

function getDisplayName (addr, profiles) {
  const profile = profiles?.[addr]
  if (profile?.name) {
    return profile.name
  }
  return truncateAddr(addr, 24)
}

function PostThreadNode ({ post, profiles = {}, depth = 0, isRoot = false }) {
  if (!post) return null

  const profile = profiles[post.addr] || {}
  const displayName = getDisplayName(post.addr, profiles)
  const hasCustomName = Boolean(profile.name)

  return (
    <div
      className={`post-thread-node${isRoot ? ' post-thread-node-root' : ''}`}
      style={{ marginLeft: depth > 0 ? `${Math.min(depth, 8) * 1.25}rem` : undefined }}
    >
      <div className='post-thread-node-inner'>
        <div className='post-thread-node-header'>
          <PostThreadAvatar
            addr={post.addr}
            profilePicUrl={profile.profilePicUrl}
          />
          <div className='post-thread-node-meta'>
            <Link
              to={`/profile/${encodeURIComponent(post.addr)}`}
              className={`post-thread-node-author${hasCustomName ? '' : ' post-thread-node-author-address'}`}
              title={post.addr}
            >
              {displayName}
            </Link>
            {!isRoot && <span className='post-thread-node-replied'>replied</span>}
            <span className='post-thread-node-seen'>{formatRelativeSeen(post.seen)}</span>
          </div>
        </div>
        <div className='post-thread-node-text'>{post.text}</div>
        {(post.replies || []).map((reply) => (
          <PostThreadNode
            key={reply.txid}
            post={reply}
            profiles={profiles}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  )
}

export default PostThreadNode
