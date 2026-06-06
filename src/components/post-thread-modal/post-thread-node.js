/*
  Single post node in a reply thread (recursive).
*/

import React from 'react'
import { Link } from 'react-router-dom'

function formatSeen (seen) {
  if (!seen) return ''
  const ms = seen > 1e12 ? seen : seen * 1000
  return new Date(ms).toLocaleString()
}

function truncateAddr (addr, maxLen = 20) {
  if (!addr || addr.length <= maxLen) return addr
  const half = Math.floor((maxLen - 3) / 2)
  return `${addr.slice(0, half)}...${addr.slice(-half)}`
}

function PostThreadNode ({ post, depth = 0, isRoot = false }) {
  if (!post) return null

  return (
    <div
      className={`post-thread-node${isRoot ? ' post-thread-node-root' : ''}`}
      style={{ marginLeft: depth > 0 ? `${Math.min(depth, 8) * 1.25}rem` : undefined }}
    >
      <div className='post-thread-node-inner'>
        <div className='post-thread-node-header text-muted'>
          <Link
            to={`/profile/${encodeURIComponent(post.addr)}`}
            className='post-thread-node-author'
            title={post.addr}
          >
            {truncateAddr(post.addr, 24)}
          </Link>
          {!isRoot && <span className='post-thread-node-replied ms-1'>replied</span>}
          <span className='post-thread-node-seen ms-2'>{formatSeen(post.seen)}</span>
        </div>
        <div className='post-thread-node-text'>{post.text}</div>
        {(post.replies || []).map((reply) => (
          <PostThreadNode key={reply.txid} post={reply} depth={depth + 1} />
        ))}
      </div>
    </div>
  )
}

export default PostThreadNode
