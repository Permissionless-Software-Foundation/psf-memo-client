/*
  Reply count indicator for a post (icon + number).
*/

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faComment } from '@fortawesome/free-solid-svg-icons'

import './post-reply-count.css'

function PostReplyCount ({ count = 0 }) {
  const label = count === 1 ? '1 reply' : `${count} replies`

  return (
    <div className='post-reply-count' title={label} aria-label={label}>
      <FontAwesomeIcon icon={faComment} className='post-reply-count-icon' />
      <span className='post-reply-count-number'>{count}</span>
    </div>
  )
}

export default PostReplyCount
