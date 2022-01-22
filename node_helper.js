/* Magic Mirror
 * Module: MagicMirror-Netatmo-Module
 *
 * By Christopher Fenner https://github.com/CFenner
 * MIT Licensed.
 */
const NodeHelper = require('node_helper')
const https = require('https')
const URLSearchParams = require('@ungap/url-search-params')

module.exports = NodeHelper.create({
  start: function () {
    console.log('Netatmo helper started ...')
    this.token = null
	  this.token_time = null
  },
  notifications: {
    auth: 'NETATMO_AUTH',
    auth_response: 'NETATMO_AUTH_RESPONSE',
    data: 'NETATMO_DATA',
    data_response: 'NETATMO_DATA_RESPONSE'
  },
  authenticate: function (config) {
    const self = this
    self.config = config

    // TODO: only update if token is invalid

    const req = https.request({
      hostname: self.config.apiBase,
      path: self.config.authEndpoint,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, self.callbackAuthenticate.bind(self))

    req.on('error', function (e) {
      console.log('There is a problem with your request:', e.message)
      self.sendSocketNotification(self.notifications.auth_response, {
        // instanceID: self.config.instanceID,
        payloadReturn: e.message
      })
    })

    req.write(new URLSearchParams({
      scope: 'read_station',
      grant_type: 'password',
      username: self.config.username,
      password: self.config.password,
      client_id: self.config.clientId,
      client_secret: self.config.clientSecret
    }).toString())

    req.end()
  },
  loadData: function (config) {
    const self = this
    self.config = config

    const req = https.request({
      hostname: self.config.apiBase,
      path: self.config.dataEndpoint,
      // method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${self.token}`
      }
    }, self.callbackData.bind(self))

    req.on('error', function (e) {
      console.log('There is a problem with your request:', e.message)
      self.sendSocketNotification(self.notifications.data_response, {
        payloadReturn: e.message,
        status: 'NOTOK',
        message: e.message
      })
    })
    /*
    req.write(new URLSearchParams({
      'access_token': self.token,
    }).toString());
*/

    req.end()
  },
  callbackAuthenticate: function (response) {
    const self = this
    let result = ''

    response.on('error', function (e) { console.log('error', e) })
    response.on('data', function (chunk) { result += chunk })
    response.on('end', function () {
      result = JSON.parse(result)
      if (response.statusCode == '200') {
        console.log('UPDATING TOKEN ' + result.access_token)
        self.token = result.access_token
        self.token_time = new Date()
        // we got a new token, save it to main file to allow it to request the datas
        self.sendSocketNotification(self.notifications.auth_response, {
          status: 'OK'
        })
      } else {
        console.log('status code:', response.statusCode, '\n', result)
        self.sendSocketNotification(self.notifications.auth_response, {
          // instanceID: self.config.instanceID,
          payloadReturn: response.statusCode,
          status: 'NOTOK',
          message: result
        })
      }
    })
  },
  callbackData: function (response) {
    const self = this
    let result = ''

    response.on('error', function (e) { console.log('error', e) })
    response.on('data', function (chunk) { result += chunk })
    response.on('end', function () {
      result = JSON.parse(result)
      if (response.statusCode == '200') {
        self.sendSocketNotification(self.notifications.data_response, {
          payloadReturn: result.body.devices,
          status: 'OK'
        })
      } else if (response.statusCode == '403') {
        console.log('status code:', response.statusCode, '\n', result)
        self.sendSocketNotification(self.notifications.data_response, {
          payloadReturn: response.statusCode,
          status: 'INVALID_TOKEN',
          message: result
        })
      } else {
        console.log('status code:', response.statusCode, '\n', result)
        self.sendSocketNotification(self.notifications.data_response, {
          payloadReturn: response.statusCode,
          status: 'NOTOK',
          message: result
        })
      }
    })
  },
  socketNotificationReceived: function (notification, payload) {
    if (notification === this.notifications.auth) {
      this.authenticate(payload)
    } else if (notification === this.notifications.data) {
      if (this.token === null) {
        this.sendSocketNotification(this.notifications.data_response, {
          payloadReturn: 400,
          status: 'INVALID_TOKEN',
          message: 'token not set'
        })
      } else {
        this.loadData(payload)
      }
    }
  }
})
