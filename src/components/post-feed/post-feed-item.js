/*
  Instagram-style post card for feed and thread views.
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

  const hasCustomName = Boolean(
    profile.name ?? profiles?.[post.addr]?.name
  )

  const profilePicUrl =
    profile.profilePicUrl ??
    profiles?.[post.addr]?.profilePicUrl

  const Wrapper = embedded ? 'div' : 'article'

  const copyTxid = () => {
    if (!post.txid) return
    appUtil.copyToClipboard(post.txid)
  }

  return (
    <Wrapper
      className={[
        'posts-feed-item',
        embedded ? 'posts-feed-item-embedded' : ''
      ].filter(Boolean).join(' ')}
    >
      <header className='posts-feed-item-header'>
        <Link
          to={`/profile/${encodeURIComponent(post.addr)}`}
          className='posts-feed-item-avatar-link'
          aria-label={`View ${displayName}'s profile`}
        >
          <PostThreadAvatar
            addr={post.addr}
            profilePicUrl={profilePicUrl}
          />
        </Link>

        <div className='posts-feed-item-meta'>
          <div className='posts-feed-item-author-row'>
            <Link
              to={`/profile/${encodeURIComponent(post.addr)}`}
              className={[
                'posts-feed-item-author',
                hasCustomName
                  ? ''
                  : 'posts-feed-item-author-address'
              ].filter(Boolean).join(' ')}
              title={post.addr}
            >
              {displayName}
            </Link>

            {showRepliedLabel && (
              <span className='posts-feed-item-replied'>
                replied
              </span>
            )}
          </div>

          <span className='posts-feed-item-seen'>
            {formatRelativeSeen(post.seen)}
          </span>
        </div>

        <button
          type='button'
          className='posts-feed-item-menu'
          aria-label='Post options'
          title='Post options'
        >
          <span aria-hidden='true'>•••</span>
        </button>
      </header>

      <div className='posts-feed-item-content'>
        <p className='posts-feed-item-text'>
          <Link
            to={`/profile/${encodeURIComponent(post.addr)}`}
            className='posts-feed-item-inline-author'
          >
            {displayName}
          </Link>

          {' '}

          {post.text}
        </p>
      </div>

      {showReplyCount && (
        <div className='posts-feed-item-actions'>
          <PostReplyCount
            count={post.replyCount ?? 0}
            onClick={onReplyClick}
          />
        </div>
      )}

      {showFooterMeta && (
        <footer className='posts-feed-item-footer'>
          <span>Block {post.blockHeight}</span>

          <span
            className='posts-feed-item-footer-separator'
            aria-hidden='true'
          >
            ·
          </span>

          <button
            type='button'
            className='posts-feed-item-txid'
            title={post.txid}
            onClick={copyTxid}
          >
            {truncateTxid(post.txid, 20)}
          </button>
        </footer>
      )}
    </Wrapper>
  )
}

export default PostFeedItem