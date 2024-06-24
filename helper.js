/* MagicMirror²
 * Module: MMM-Netatmo
 *
 * By Christopher Fenner https://github.com/CFenner
 * Review @bugsounet https://github.com/bugsounet
 * MIT Licensed.
 */
const fs = require('fs')
const path = require('path')
const moment = require('moment')

module.exports = {
  notifications: {
    AUTH: 'NETATMO_AUTH',
    AUTH_RESPONSE: 'NETATMO_AUTH_RESPONSE',
    DATA: 'NETATMO_DATA',
    DATA_RESPONSE: 'NETATMO_DATA_RESPONSE',
  },

  start () {
    console.log('Netatmo helper started ...')
    this.token = null
  },

  async authenticate () {
    const params = new URLSearchParams()
    params.append('grant_type', 'refresh_token')
    params.append('refresh_token', this.refreshToken)
    params.append('client_id', this.clientId)
    params.append('client_secret', this.clientSecret)

    try {
      const result = await fetch(`https://${this.config.apiBase}${this.config.authEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      }).then((response) => response.json())

      if (result.error) {
        throw new Error(`${result.error} : ${result.error_description}`)
      };

      this.token = result.access_token
      this.token_expires_in = result.expires_in
      this.refreshToken = result.refresh_token
      console.log('Netatmo: Authenticated')

      // write in token file and provides for token refresh
      this.writeToken(result)
      if (result.expires_in) {
        const expireAt = moment(Date.now() + (result.expires_in * 1000)).format('LLLL')
        console.log(`Netatmo: New Token Expire ${expireAt}`)
        setTimeout(() => this.authenticateRefresh(result.refresh_token), (result.expires_in - 60) * 1000)
      };

      // inform module AUTH ok
      this.sendSocketNotification(this.notifications.AUTH_RESPONSE, {
        status: 'OK',
      })
    } catch (error) {
      console.error('Netatmo:', error)
      this.sendSocketNotification(this.notifications.AUTH_RESPONSE, {
        payloadReturn: error,
        status: 'NOTOK',
        message: error,
      })
    };
  },

  async loadData () {
    if (this.config.mockData === true) {
      this.sendSocketNotification(this.notifications.DATA_RESPONSE, {
        payloadReturn: this.mockData(),
        status: 'OK',
      })
      return
    };

    if (!this.token) {
      this.sendSocketNotification(this.notifications.DATA_RESPONSE, {
        payloadReturn: 400,
        status: 'INVALID_TOKEN',
        message: 'token not set',
      })
      return
    };

    try {
      let result = await fetch(`https://${this.config.apiBase}${this.config.dataEndpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
      })

      if (result.status === 403) {
        console.warn(`Netatmo: status code: ${result.status} (${result.statusText})`)
        this.sendSocketNotification(this.notifications.DATA_RESPONSE, {
          payloadReturn: result.statusText,
          status: 'INVALID_TOKEN',
          message: result,
        })
        return
      };

      result = await result.json()

      if (result.error) {
        throw new Error(result.error.message)
      };

      this.sendSocketNotification(this.notifications.DATA_RESPONSE, {
        payloadReturn: result.body,
        status: 'OK',
      })
    } catch (error) {
      console.error('Netatmo:', error)
      this.sendSocketNotification(this.notifications.DATA_RESPONSE, {
        payloadReturn: error,
        status: 'NOTOK',
        message: error,
      })
    };
  },

  mockData () {
    const sample = fs.readFileSync(path.join(__dirname, 'sample', 'sample.json'), 'utf8')
    return JSON.parse(sample)
  },

  socketNotificationReceived (notification, payload) {
    switch (notification) {
      case 'INIT':
        this.Init(payload)
        break
      case this.notifications.AUTH:
        this.authenticate()
        break
      case this.notifications.DATA:
        this.loadData()
        break
    }
  },

  Init (config) {
    this.config = config
    if (!this.config.clientId) {
      console.error('Netatmo: clientId not set in config.')
      return
    }
    this.clientId = this.config.clientId

    if (!this.config.clientSecret) {
      console.error('Netatmo: clientSecret not set in config.')
      return
    }
    this.clientSecret = this.config.clientSecret

    const refreshToken = this.readToken()
    this.refreshToken = refreshToken || this.config.refresh_token

    if (!this.refreshToken) {
      console.error('Netatmo: refresh_token not set in config.')
      return
    }

    console.log('Netatmo: Initialized')
    this.authenticate()
  },

  /* from MMM-NetatmoThermostat
   * @bugsounet
   */
  readToken () {
    const file = path.resolve(__dirname, './token.json')
    // check presence of token.json
    if (fs.existsSync(file)) {
      console.log('Netatmo: using token.json file')
      const tokenFile = JSON.parse(fs.readFileSync(file))
      const refreshToken = tokenFile.refresh_token
      if (!refreshToken) {
        console.error('Netatmo: Token not found in token.json file')
        console.log('Netatmo: using refresh_token from config')
        return null
      }
      return refreshToken
    }
    // Token file not used
    console.log('Netatmo: using refresh_token from config')
    return null
  },

  writeToken (token) {
    try {
      const file = path.resolve(__dirname, './token.json')
      fs.writeFileSync(file, JSON.stringify(token))
      console.log('Netatmo: token.json was written successfully')
      return token
    } catch (error) {
      ;
      console.error('Netatmo: writeToken error', error.message)
      return null
    };
  },

  // Refresh Token
  async authenticateRefresh (refreshToken) {
    console.log('Netatmo: Refresh Token')
    const params = new URLSearchParams()
    params.append('grant_type', 'refresh_token')
    params.append('refresh_token', refreshToken)
    params.append('client_id', this.clientId)
    params.append('client_secret', this.clientSecret)

    try {
      const result = await fetch(`https://${this.config.apiBase}${this.config.authEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      }).then((response) => response.json())

      if (result.error) {
        throw new Error(result.error)
      };

      this.writeToken(result)
      this.token = result.access_token
      console.log('Netatmo: TOKEN Updated')

      if (result.expires_in) {
        const expireAt = moment(Date.now() + (result.expires_in * 1000)).format('LLLL')
        console.log(`Netatmo: New Token Expire ${expireAt}`)
        setTimeout(() => this.authenticateRefresh(result.refresh_token), (result.expires_in - 60) * 1000)
      };

      this.sendSocketNotification(this.notifications.AUTH_RESPONSE, {
        status: 'OK',
      })
    } catch (error) {
      console.error('Netatmo:', error)
      this.sendSocketNotification(this.notifications.AUTH_RESPONSE, {
        payloadReturn: error,
        status: 'NOTOK',
        message: error,
      })
      console.log('Netatmo: Retry login in 60 sec')
      setTimeout(() => this.authenticate(this.config), 60 * 1000)
    }
  },
}
