/*
  HTTP client for the psf-memo-db REST API.
*/

import axios from 'axios'
import config from '../config'

class MemoDb {
  constructor () {
    this.axios = axios
  }

  async getRecentProfiles ({ limit = 100, offset = 0 } = {}) {
    try {
      const result = await this.axios.get(`${config.backend}/profile/recent`, {
        params: { limit, offset }
      })

      return result.data
    } catch (err) {
      console.error('Error in getRecentProfiles()')
      throw err
    }
  }

  async getRecentPosts ({ limit = 100, offset = 0 } = {}) {
    try {
      const result = await this.axios.get(`${config.backend}/posts/recent`, {
        params: { limit, offset }
      })

      return result.data
    } catch (err) {
      console.error('Error in getRecentPosts()')
      throw err
    }
  }

  async getProfile (addr) {
    try {
      const result = await this.axios.get(
        `${config.backend}/level/profile/${encodeURIComponent(addr)}`
      )
      return result.data
    } catch (err) {
      if (err.response && err.response.status === 404) {
        return null
      }
      console.error('Error in getProfile()')
      throw err
    }
  }

  async getProfilePic (addr) {
    try {
      const result = await this.axios.get(
        `${config.backend}/level/profilepic/${encodeURIComponent(addr)}`
      )
      return result.data
    } catch (err) {
      if (err.response && err.response.status === 404) {
        return null
      }
      console.error('Error in getProfilePic()')
      throw err
    }
  }

  async getName (addr) {
    try {
      const result = await this.axios.get(
        `${config.backend}/level/name/${encodeURIComponent(addr)}`
      )
      return result.data
    } catch (err) {
      if (err.response && err.response.status === 404) {
        return null
      }
      console.error('Error in getName()')
      throw err
    }
  }

  async getPostsByAddr (addr, { limit = 100, offset = 0 } = {}) {
    try {
      const result = await this.axios.get(
        `${config.backend}/posts/by/${encodeURIComponent(addr)}`,
        { params: { limit, offset } }
      )

      return result.data
    } catch (err) {
      console.error('Error in getPostsByAddr()')
      throw err
    }
  }

  async getPostThread (txid) {
    try {
      const result = await this.axios.get(
        `${config.backend}/posts/${encodeURIComponent(txid)}/thread`
      )

      return result.data
    } catch (err) {
      console.error('Error in getPostThread()')
      throw err
    }
  }
}

export default MemoDb
