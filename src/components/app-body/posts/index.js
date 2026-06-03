/*
  Display the most recent Memo posts from psf-memo-db.
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Spinner, Table } from 'react-bootstrap'

// Local libraries
import MemoDb from '../../../services/memo-db'
import AppUtil from '../../../util'
import '../../../App.css'

const appUtil = new AppUtil()

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

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const memoDb = new MemoDb()
        const data = await memoDb.getRecentPosts({ limit: 100, offset: 0 })
        setPosts(data.posts || [])
        setPagination(data.pagination || null)
      } catch (err) {
        setError(err.message || 'Failed to load recent posts')
      }
      setLoading(false)
    }

    loadPosts()
  }, [])

  return (
    <Container>
      <Row>
        <Col>
          <h1 className='mt-4'>Recent Posts</h1>
          {pagination && (
            <p className='text-muted'>
              Showing {posts.length} of {pagination.total} posts
            </p>
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
                      <span style={{ fontFamily: 'monospace' }} title={post.addr}>
                        {truncate(post.addr, 24)}
                      </span>
                    </td>
                    <td>{post.text}</td>
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
        </Col>
      </Row>
    </Container>
  )
}

export default RecentPosts
