const moduleName = 'api'
const moduleUnderTest = require('./' + moduleName + '.js')

describe(moduleName, () => {
  test('test notifications map', () => {
    expect(moduleUnderTest.notifications).toHaveProperty('AUTH', 'NETATMO_AUTH')
    expect(moduleUnderTest.notifications).toHaveProperty('AUTH_RESPONSE', 'NETATMO_AUTH_RESPONSE')
    expect(moduleUnderTest.notifications).toHaveProperty('DATA', 'NETATMO_DATA')
    expect(moduleUnderTest.notifications).toHaveProperty('DATA_RESPONSE', 'NETATMO_DATA_RESPONSE')
  })
})
