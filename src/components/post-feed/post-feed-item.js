/*
  Single post row for feed and thread views.
*/

import React from 'react'
import { Link } from 'react-router-dom'

import AppUtil from '../../util'
import PostReplyCount from '../post-reply-count'
import PostThreadAvatar from '../post-thread-modal/post-thread-avatar'
import {
  formatRelativeSeen,
  getDisplayName,
  truncateTxid
} from './post-display'
import './post-feed.css'

const appUtil = new AppUtil()

function PostFeedItem ({
  post,
  profile = {},
  profiles = {},
  onReplyClick,
  showRepliedLabel = false,
  showFooterMeta = false,
  showReplyCount = true,
  embedded = false
}) {
  if (!post) return null

  const displayName = getDisplayName(post.addr, profiles)
  const hasCustomName = Boolean(profile.name ?? profiles?.[post.addr]?.name)
  const Wrapper = embedded ? 'div' : 'article'

  return (
    <Wrapper className={`posts-feed-item${embedded ? ' posts-feed-item-embedded' : ''}`}>
      <div className='posts-feed-item-header'>
        <PostThreadAvatar
          addr={post.addr}
          profilePicUrl={profile.profilePicUrl ?? profiles?.[post.addr]?.profilePicUrl}
        />
        <div className='posts-feed-item-meta'>
          <Link
            to={`/profile/${encodeURIComponent(post.addr)}`}
            className={`posts-feed-item-author${hasCustomName ? '' : ' posts-feed-item-author-address'}`}
            title={post.addr}
          >
            {displayName}
          </Link>
          {showRepliedLabel && (
            <span className='posts-feed-item-replied'>replied</span>
          )}
          <span className='posts-feed-item-seen'>{formatRelativeSeen(post.seen)}</span>
        </div>
      </div>

      <div className='posts-feed-item-text'>{post.text}</div>

      {showReplyCount && (
        <div className='posts-feed-item-actions'>
          <PostReplyCount
            count={post.replyCount ?? 0}
            onClick={onReplyClick}
          />
        </div>
      )}

      {showFooterMeta && (
        <div className='posts-feed-item-footer'>
          <span>Block {post.blockHeight}</span>
          <span className='posts-feed-item-footer-separator'>·</span>
          <span
            className='posts-feed-item-txid'
            title={post.txid}
            onClick={() => appUtil.copyToClipboard(post.txid)}
            role='button'
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                appUtil.copyToClipboard(post.txid)
              }
            }}
          >
            {truncateTxid(post.txid, 20)}
          </span>
        </div>
      )}
    </Wrapper>
  )
}

export default PostFeedItem
