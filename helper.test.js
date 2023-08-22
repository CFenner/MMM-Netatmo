require('dotenv').config()
const moduleUnderTest = require('./helper.js')

const apiBase = 'api.netatmo.com'
const authEndpoint = '/oauth2/token'
const dataEndpoint = '/api/getstationsdata'

describe('helper', () => {
  afterEach(() => {
    delete moduleUnderTest.token
    delete moduleUnderTest.token_expires_in
    delete moduleUnderTest.refresh_token
    delete moduleUnderTest.sendSocketNotification
  })
  describe('data', () => {
    test('existing token', () => {
      // moduleUnderTest.token = process.env.TOKEN
      // prepare
      expect(moduleUnderTest).not.toHaveProperty('token')
      moduleUnderTest.sendSocketNotification = jest.fn((type, payload) => {})
      moduleUnderTest.authenticate({
        apiBase,
        authEndpoint,
        refresh_token: process.env.REFRESH_TOKEN,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
      })
      expect(moduleUnderTest).toHaveProperty('token')
      moduleUnderTest.sendSocketNotification = jest.fn((type, payload) => {
        expect(type).toBe(moduleUnderTest.notifications.DATA_RESPONSE)
        expect(payload).toHaveProperty('status', 'OK')
        expect(payload).toHaveProperty('payloadReturn')
        expect(payload.payloadReturn).toHaveLength(2)
      })
      expect(moduleUnderTest).toHaveProperty('token')
      // test
      moduleUnderTest.loadData({
        apiBase,
        dataEndpoint,
      })
      // assert
      expect(moduleUnderTest.sendSocketNotification).toHaveBeenCalled()
    })

    test('with missing token', () => {
      // moduleUnderTest.token = process.env.TOKEN
      // prepare
      moduleUnderTest.sendSocketNotification = jest.fn((type, payload) => {
        expect(type).toBe(moduleUnderTest.notifications.DATA_RESPONSE)
        expect(payload).toHaveProperty('status', 'INVALID_TOKEN')
      })
      // test
      moduleUnderTest.loadData({
        apiBase,
        dataEndpoint,
      })
      // assert
      expect(moduleUnderTest.sendSocketNotification).toHaveBeenCalled()
    })

    test('with invalid token', () => {
      moduleUnderTest.token = 'something'
      // prepare
      moduleUnderTest.sendSocketNotification = jest.fn((type, payload) => {
        expect(type).toBe(moduleUnderTest.notifications.DATA_RESPONSE)
        expect(payload).toHaveProperty('status', 'INVALID_TOKEN')
      })
      // test
      moduleUnderTest.loadData({
        apiBase,
        dataEndpoint,
      })
      // assert
      expect(moduleUnderTest.sendSocketNotification).toHaveBeenCalled()
    })
  })

  describe('authentication', () => {
    test('with refresh_token from config', () => {
      // prepare
      moduleUnderTest.sendSocketNotification = jest.fn((type, payload) => {
        expect(type).toBe(moduleUnderTest.notifications.AUTH_RESPONSE)
        expect(payload).toHaveProperty('status', 'OK')
      })
      expect(moduleUnderTest).not.toHaveProperty('token')
      expect(moduleUnderTest).not.toHaveProperty('token_expires_in')
      expect(moduleUnderTest).not.toHaveProperty('refresh_token')
      // test
      moduleUnderTest.authenticate({
        apiBase,
        authEndpoint,
        refresh_token: process.env.REFRESH_TOKEN,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
      })
      // assert
      expect(moduleUnderTest).toHaveProperty('token')
      expect(moduleUnderTest).toHaveProperty('token_expires_in')
      expect(moduleUnderTest).toHaveProperty('refresh_token')
      expect(moduleUnderTest.sendSocketNotification).toHaveBeenCalled()
    })

    test('with refresh_token from object', () => {
      // prepare
      moduleUnderTest.refresh_token = process.env.REFRESH_TOKEN
      moduleUnderTest.sendSocketNotification = jest.fn((type, payload) => {
        expect(type).toBe(moduleUnderTest.notifications.AUTH_RESPONSE)
        expect(payload).toHaveProperty('status', 'OK')
      })
      expect(moduleUnderTest).not.toHaveProperty('token')
      expect(moduleUnderTest).not.toHaveProperty('token_expires_in')
      expect(moduleUnderTest).toHaveProperty('refresh_token')
      // test
      moduleUnderTest.authenticate({
        apiBase,
        authEndpoint,
        refresh_token: '',
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
      })
      // assert
      expect(moduleUnderTest).toHaveProperty('token')
      expect(moduleUnderTest).toHaveProperty('token_expires_in')
      expect(moduleUnderTest).toHaveProperty('refresh_token')
      expect(moduleUnderTest.sendSocketNotification).toHaveBeenCalled()
    })

    test('without refresh_token', () => {
      // prepare
      moduleUnderTest.sendSocketNotification = jest.fn((type, payload) => {
        expect(type).toBe(moduleUnderTest.notifications.AUTH_RESPONSE)
        expect(payload).toHaveProperty('status', 'NOTOK')
      })
      expect(moduleUnderTest).not.toHaveProperty('token')
      expect(moduleUnderTest).not.toHaveProperty('token_expires_in')
      expect(moduleUnderTest).not.toHaveProperty('refresh_token')
      // test
      moduleUnderTest.authenticate({
        apiBase,
        authEndpoint,
        refresh_token: '',
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
      })
      // assert
      expect(moduleUnderTest).not.toHaveProperty('token')
      expect(moduleUnderTest).not.toHaveProperty('token_expires_in')
      expect(moduleUnderTest).not.toHaveProperty('refresh_token')
      expect(moduleUnderTest.sendSocketNotification).toHaveBeenCalled()
    })
  })
})
