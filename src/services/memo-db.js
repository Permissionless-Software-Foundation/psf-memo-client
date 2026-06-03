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
}

export default MemoDb
