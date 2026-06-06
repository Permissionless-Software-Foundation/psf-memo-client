/*
  Display the most recent Memo posts from psf-memo-db.
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Container, Row, Col, Spinner, Table, Button } from 'react-bootstrap'

// Local libraries
import MemoDb from '../../../services/memo-db'
import AppUtil from '../../../util'
import PostReplyCount from '../../post-reply-count'
import PostThreadModal from '../../post-thread-modal'
import '../../../App.css'

const appUtil = new AppUtil()
const PAGE_SIZE = 100

function truncate (str, maxLen = 16) {
  if (!str || str.length <= maxLen) return str
  const half = Math.floor((maxLen - 3) / 2)
  return `${str.slice(0, half)}...${str.slice(-half)}`
}

function formatSeen (seen) {
  if (!seen) return ''
  const ms = seen > 1e12 ? seen : seen * 1000
  return new Date(ms).toLocaleString()
}

function RecentPosts () {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [posts, setPosts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [offset, setOffset] = useState(0)
  const [threadTxid, setThreadTxid] = useState(null)
  const [showThreadModal, setShowThreadModal] = useState(false)

  const openThread = (txid) => {
    setThreadTxid(txid)
    setShowThreadModal(true)
  }

  const closeThread = () => {
    setShowThreadModal(false)
    setThreadTxid(null)
  }

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true)
      setError(null)

      try {
        const memoDb = new MemoDb()
        const data = await memoDb.getRecentPosts({ limit: PAGE_SIZE, offset })
        setPosts(data.posts || [])
        setPagination(data.pagination || null)
      } catch (err) {
        setError(err.message || 'Failed to load recent posts')
        setPosts([])
        setPagination(null)
      }

      setLoading(false)
    }

    loadPosts()
  }, [offset])

  const canGoBack = offset > 0
  const canGoNext = pagination?.hasMore ?? false

  const handlePrevious = () => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
  }

  const handleNext = () => {
    setOffset((prev) => prev + PAGE_SIZE)
  }

  return (
    <Container>
      <Row>
        <Col>
          <h1 className='mt-4'>Recent Posts</h1>
          {pagination && posts.length > 0 && (
            <p className='text-muted'>
              Showing {pagination.offset + 1}–{pagination.offset + posts.length} of {pagination.total} posts
            </p>
          )}
          {pagination && posts.length === 0 && (
            <p className='text-muted'>No posts on this page.</p>
          )}

          {error && <p className='text-danger'>{error}</p>}

          {loading && (
            <div className='text-center my-5'>
              <Spinner animation='border' role='status' variant='primary'>
                <span className='visually-hidden'>Loading...</span>
              </Spinner>
            </div>
          )}

          {!loading && !error && (
            <Table striped bordered hover responsive className='mt-3'>
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Post</th>
                  <th>Block</th>
                  <th>Seen</th>
                  <th>TXID</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.txid}>
                    <td>
                      <Link
                        to={`/profile/${encodeURIComponent(post.addr)}`}
                        style={{ fontFamily: 'monospace' }}
                        title={post.addr}
                      >
                        {truncate(post.addr, 24)}
                      </Link>
                    </td>
                    <td>
                      <div>{post.text}</div>
                      <PostReplyCount
                        count={post.replyCount ?? 0}
                        onClick={() => openThread(post.txid)}
                      />
                    </td>
                    <td>{post.blockHeight}</td>
                    <td>{formatSeen(post.seen)}</td>
                    <td>
                      <span
                        style={{ fontFamily: 'monospace', cursor: 'pointer' }}
                        title={post.txid}
                        onClick={() => appUtil.copyToClipboard(post.txid)}
                      >
                        {truncate(post.txid, 20)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {!loading && !error && (pagination || offset > 0) && (
            <div className='d-flex justify-content-between mt-3 mb-4'>
              <Button
                variant='outline-primary'
                onClick={handlePrevious}
                disabled={!canGoBack}
              >
                Previous
              </Button>
              <Button
                variant='outline-primary'
                onClick={handleNext}
                disabled={!canGoNext}
              >
                Next
              </Button>
            </div>
          )}
        </Col>
      </Row>

      <PostThreadModal
        show={showThreadModal}
        txid={threadTxid}
        onHide={closeThread}
      />
    </Container>
  )
}

export default RecentPosts
