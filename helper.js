/* MagicMirror²
 * Module: MMM-Netatmo
 *
 * By Christopher Fenner https://github.com/CFenner
 * MIT Licensed.
 */
const fs = require('fs')
const path = require('path')
const URLSearchParams = require('@ungap/url-search-params')

module.exports = {
  notifications: {
    AUTH: 'NETATMO_AUTH',
    AUTH_RESPONSE: 'NETATMO_AUTH_RESPONSE',
    DATA: 'NETATMO_DATA',
    DATA_RESPONSE: 'NETATMO_DATA_RESPONSE',
  },
  start: function () {
    console.log('Netatmo helper started ...')
    this.token = null
  },
  authenticate: async function (config) {
    const self = this
    self.config = config

    const refreshToken = this.readToken();

    const params = new URLSearchParams()
    params.append('grant_type', 'refresh_token')
    params.append('refresh_token', refreshToken || self.refresh_token || self.config.refresh_token)
    params.append('client_id', self.config.clientId)
    params.append('client_secret', self.config.clientSecret)

    try {
      const result = await fetch('https://' + self.config.apiBase + self.config.authEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      }).then(response => response.json())

      if (result.error) {
        throw new Error(result.error + ': ' + result.error_description)
      }

      console.log('UPDATING TOKEN ' + result.access_token)
      self.token = result.access_token
      self.token_expires_in = result.expires_in
      self.refresh_token = result.refresh_token
      this.writeToken(result);
      // we got a new token, save it to main file to allow it to request the datas
      self.sendSocketNotification(self.notifications.AUTH_RESPONSE, {
        status: 'OK',
      })
    } catch (error) {
      console.log('error:', error)
      self.sendSocketNotification(self.notifications.AUTH_RESPONSE, {
        payloadReturn: error,
        status: 'NOTOK',
        message: error,
      })
    }
  },
  loadData: async function (config) {
    const self = this
    self.config = config

    if (self.config.mockData === true) {
      self.sendSocketNotification(self.notifications.DATA_RESPONSE, {
        payloadReturn: this.mockData(),
        status: 'OK',
      })
      return
    }
    if (self.token === null || self.token === undefined) {
      self.sendSocketNotification(self.notifications.DATA_RESPONSE, {
        payloadReturn: 400,
        status: 'INVALID_TOKEN',
        message: 'token not set',
      })
      return
    }

    try {
      let result = await fetch('https://' + self.config.apiBase + self.config.dataEndpoint, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${self.token}`,
        },
      })

      if (result.status === 403) {
        console.log('status code:', result.status, '\n', result.statusText)
        self.sendSocketNotification(self.notifications.DATA_RESPONSE, {
          payloadReturn: result.statusText,
          status: 'INVALID_TOKEN',
          message: result,
        })
        return
      }

      result = await result.json()

      if (result.error) {
        throw new Error(result.error.message)
      }

      self.sendSocketNotification(self.notifications.DATA_RESPONSE, {
        payloadReturn: result.body.devices,
        status: 'OK',
      })
    } catch (error) {
      console.log('error:', error)
      self.sendSocketNotification(self.notifications.DATA_RESPONSE, {
        payloadReturn: error,
        status: 'NOTOK',
        message: error,
      })
    }
  },
  mockData: function () {
    const sample = fs.readFileSync(path.join(__dirname, 'sample', 'sample.json'), 'utf8')
    return JSON.parse(sample)
  },
  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case this.notifications.AUTH:
        this.authenticate(payload)
        break
      case this.notifications.DATA:
        this.loadData(payload)
        break
    }
  },

  /* from MMM-Netatmo
   * @bugsounet
   */
  readToken: function() {
    var refresh_token = null;
    var file = path.resolve(__dirname, "./token.json");
    // check presence of token.json
    if (fs.existsSync(file)) {
      let tokenFile = JSON.parse(fs.readFileSync(file));
      refresh_token = tokenFile.refresh_token;
      if (!refresh_token) {
        console.error("Token not found in token.json file");
        return null;
      }
      return refresh_token;
    }
    // Token file not used
    return null;
  },

  writeToken: function(token) {
    try {
      var file = path.resolve(__dirname, "./token.json");
      fs.writeFileSync(file, JSON.stringify(token));
      console.log("netatmo token.json was written successfully");
      return token;
    } catch (error) {
      console.error("netatmo token.json writeToken error", error.message);
      return null;
    }
  }
}
