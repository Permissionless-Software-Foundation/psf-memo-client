/*
  Modal displaying a post and its nested reply thread.
*/

import React, { useState, useEffect } from 'react'
import { Modal, Spinner } from 'react-bootstrap'

import MemoDb from '../../services/memo-db'
import PostThreadNode from './post-thread-node'
import { collectThreadAddrs, loadThreadProfiles } from './thread-profiles'
import './post-thread-modal.css'
import '../post-feed/post-feed.css'

function PostThreadModal ({ show, txid, onHide }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [thread, setThread] = useState(null)
  const [profiles, setProfiles] = useState({})

  useEffect(() => {
    if (!show || !txid) {
      return undefined
    }

    let cancelled = false

    const loadThread = async () => {
      setLoading(true)
      setError(null)
      setThread(null)
      setProfiles({})

      try {
        const memoDb = new MemoDb()
        const data = await memoDb.getPostThread(txid)
        const post = data.post || null

        if (cancelled) return

        if (post) {
          const addrs = collectThreadAddrs(post)
          const profileMap = await loadThreadProfiles(addrs, memoDb)
          if (!cancelled) {
            setThread(post)
            setProfiles(profileMap)
          }
        } else if (!cancelled) {
          setThread(null)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err.response?.data?.message || err.message || 'Failed to load replies'
          setError(message)
        }
      }

      if (!cancelled) {
        setLoading(false)
      }
    }

    loadThread()

    return () => {
      cancelled = true
    }
  }, [show, txid])

  const handleHide = () => {
    setThread(null)
    setProfiles({})
    setError(null)
    onHide()
  }

  return (
    <Modal show={show} onHide={handleHide} size='lg' scrollable centered>
      <Modal.Header closeButton>
        <Modal.Title>Post thread</Modal.Title>
      </Modal.Header>
      <Modal.Body className='post-thread-modal-body'>
        {loading && (
          <div className='text-center my-4'>
            <Spinner animation='border' role='status' variant='primary'>
              <span className='visually-hidden'>Loading replies...</span>
            </Spinner>
          </div>
        )}

        {error && !loading && (
          <p className='text-danger mb-0'>{error}</p>
        )}

        {!loading && !error && thread && (
          <PostThreadNode post={thread} profiles={profiles} isRoot />
        )}
      </Modal.Body>
    </Modal>
  )
}

export default PostThreadModal
