/*
  Reply count indicator for a post (icon + number).
*/

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faComment } from '@fortawesome/free-solid-svg-icons'

import './post-reply-count.css'

function PostReplyCount ({ count = 0, onClick }) {
  const label = count === 1 ? '1 reply' : `${count} replies`
  const clickable = count > 0 && typeof onClick === 'function'
  const title = clickable ? `${label} — click to view` : label

  const handleKeyDown = (event) => {
    if (clickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <div
      className={`post-reply-count${clickable ? ' post-reply-count-clickable' : ''}`}
      title={title}
      aria-label={title}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
    >
      <FontAwesomeIcon icon={faComment} className='post-reply-count-icon' />
      <span className='post-reply-count-number'>{count}</span>
    </div>
  )
}

export default PostReplyCount
