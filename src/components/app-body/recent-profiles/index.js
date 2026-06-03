/*
  Display the most recent Memo profiles from psf-memo-db.
*/

// Global npm libraries
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Spinner, Table } from 'react-bootstrap'

// Local libraries
import MemoDb from '../../../services/memo-db'
import '../../../App.css'

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

function RecentProfiles () {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [pagination, setPagination] = useState(null)

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const memoDb = new MemoDb()
        const data = await memoDb.getRecentProfiles({ limit: 100, offset: 0 })
        setProfiles(data.profiles || [])
        setPagination(data.pagination || null)
      } catch (err) {
        setError(err.message || 'Failed to load recent profiles')
      }
      setLoading(false)
    }

    loadProfiles()
  }, [])

  return (
    <Container>
      <Row>
        <Col>
          <h1 className='mt-4'>Recent Profiles</h1>
          {pagination && (
            <p className='text-muted'>
              Showing {profiles.length} of {pagination.total} profiles
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
                  <th>Bio</th>
                  <th>Block</th>
                  <th>Seen</th>
                  <th>TxID</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={`${profile.addr}-${profile.txid}`}>
                    <td>
                      <span style={{ fontFamily: 'monospace' }} title={profile.addr}>
                        {truncate(profile.addr, 24)}
                      </span>
                    </td>
                    <td>{profile.text}</td>
                    <td>{profile.blockHeight}</td>
                    <td>{formatSeen(profile.seen)}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace' }} title={profile.txid}>
                        {truncate(profile.txid, 20)}
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

export default RecentProfiles
