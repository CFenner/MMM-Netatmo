/* Magic Mirror
 * Module: Netatmo
 *
 * By Christopher Fenner http://github.com/CFenner
 * MIT Licensed.
 */
/* global Module, Log */
Module.register('netatmo', {
  // default config
  defaults: {
    initialDelay: 0,
    updateInterval: 3, // every 3 minutes, refresh interval on netatmo is 10 minutes
    animationSpeed: 1000,
    // hideLoadTimer: false,
    lastMessageThreshold: 600, // in seconds (10 minutes)
    showLastMessage: true,
    showBattery: true,
    showRadio: true,
    showWiFi: true,
    showTrend: true,
    showIcon: true,
    showLabel: true,
    apiBase: 'api.netatmo.com',
    authEndpoint: '/oauth2/token',
    dataEndpoint: '/api/getstationsdata',
    fontClassModuleName: 'xsmall',
    fontClassPrimary: 'large',
    fontClassSecondary: 'xsmall',
    fontClassMeasurement: 'xsmall'
  },
  notifications: {
    auth: 'NETATMO_AUTH',
    auth_response: 'NETATMO_AUTH_RESPONSE',
    data: 'NETATMO_DATA',
    data_response: 'NETATMO_DATA_RESPONSE'
  },
  moduleType: {
    MAIN: 'NAMain',
    INDOOR: 'NAModule4',
    OUTDOOR: 'NAModule1',
    RAIN: 'NAModule3',
    WIND: 'NAModule2'
  },
  measurement: {
    CO2: 'CO2',
    HUMIDITY: 'Humidity',
    TEMPERATURE: 'Temperature',
    TEMPERATURE_TREND: 'temp_trend',
    PRESSURE: 'Pressure',
    PRESSURE_TREND: 'pressure_trend',
    NOISE: 'Noise',
    WIND_STRENGTH: 'WindStrength',
    WIND_ANGLE: 'WindAngle',
    GUST_STRENGTH: 'GustStrength',
    GUST_ANGLE: 'GustAngle',
    RAIN: 'Rain',
    RAIN_PER_HOUR: 'sum_rain_1',
    RAIN_PER_DAY: 'sum_rain_24'
  },
  // init method
  start: function () {
    const self = this
    Log.info(`Starting module: ${this.name}`)
    self.loaded = false
    self.moduleList = []

    // get a new token at start-up. When receive, GET_CAMERA_EVENTS will be requested
    setTimeout(function () {
      self.sendSocketNotification(self.notifications.data, self.config)
    }, this.config.initialDelay * 1000)

    // set auto-update
    setInterval(function () {
      // request directly the data, with the previous token. When the token will become invalid (error 403), it will be requested again
      self.sendSocketNotification(self.notifications.data, self.config)
    }, this.config.updateInterval * 60 * 1000 + this.config.initialDelay * 1000)
  },
  updateModuleList: function (station) {
    const moduleList = []

    moduleList.push(this.getModule(station))

    station.modules.forEach(function (module) {
      moduleList.push(this.getModule(module))
    }.bind(this))

    if (station.reachable) { this.lastUpdate = station.dashboard_data.time_utc }
    this.loaded = true
    if (JSON.stringify(this.moduleList) === JSON.stringify(moduleList)) {
      return
    }
    this.moduleList = moduleList
  },
  getModule: function (module) {
    const result = {}

    result.name = module.module_name
    result.measurementList = []

    if (!module.reachable) return result

    // TODO check module.reachable
    let primaryType = ''
    let primaryValue = ''
    let secondaryType = ''
    let secondaryValue = ''

    // add module sensor measurements
    switch (module.type) {
      case this.moduleType.MAIN:
        result.measurementList.push(this.getMeasurement(module, this.measurement.PRESSURE))
        result.measurementList.push(this.getMeasurement(module, this.measurement.PRESSURE_TREND))
        result.measurementList.push(this.getMeasurement(module, this.measurement.NOISE))
        // break; fallthrough
      case this.moduleType.INDOOR:
        secondaryType = this.measurement.CO2
        secondaryValue = module.dashboard_data[secondaryType]
        let status = 'good'
        if (secondaryValue > 800) status = 'bad'
        if (secondaryValue > 1600) status = 'bad'
        result.secondary = { visualClass: status, value: this.getValue(secondaryType, secondaryValue), class: this.kebabCase(secondaryType) }
        // break; fallthrough
      case this.moduleType.OUTDOOR:
        primaryType = this.measurement.TEMPERATURE
        primaryValue = module.dashboard_data ? module.dashboard_data[primaryType] : ''
        result.primary = { unit: '', value: this.getValue(primaryType, primaryValue), class: this.kebabCase(primaryType) }
        result.measurementList.push(this.getMeasurement(module, this.measurement.TEMPERATURE_TREND))
        result.measurementList.push(this.getMeasurement(module, this.measurement.HUMIDITY))
        break
      case this.moduleType.WIND:
        primaryType = this.measurement.WIND_STRENGTH
        primaryValue = module.dashboard_data ? module.dashboard_data[primaryType] : ''
        result.primary = { unit: 'm/s', value: primaryValue, class: this.kebabCase(primaryType) }
        secondaryType = this.measurement.WIND_ANGLE
        secondaryValue = module.dashboard_data[type]
        result.secondary = { visualClass: 'xlarge wi wi-direction-up', value: this.getValue(secondaryType, secondaryValue), class: this.kebabCase(secondaryType) }
        //         $('<div/>').addClass('visual xlarge wi wi-direction-up').css('transform', 'rotate(' + value + 'deg)')
        result.measurementList.push(this.getMeasurement(module, this.measurement.GUST_STRENGTH))
        result.measurementList.push(this.getMeasurement(module, this.measurement.GUST_ANGLE))
        break
      case this.moduleType.RAIN:
        primaryType = this.measurement.RAIN
        primaryValue = module.dashboard_data ? module.dashboard_data[primaryType] : ''
        result.primary = { unit: 'mm/h', value: primaryValue, class: this.kebabCase(primaryType) }
        result.measurementList.push(this.getMeasurement(module, this.measurement.RAIN_PER_HOUR))
        result.measurementList.push(this.getMeasurement(module, this.measurement.RAIN_PER_DAY))
        break
      default:
        break
    }
    // add additional measurements
    if (module.type === this.moduleType.MAIN) {
      result.measurementList.push(this.getMeasurement(module, 'wifi', module.wifi_status))
    } else {
      result.measurementList.push(this.getMeasurement(module, 'radio', module.rf_status))
      result.measurementList.push(this.getMeasurement(module, 'battery', module.battery_percent))
    }
    return result
  },
  getMeasurement: function (module, measurement, value) {
    value = value || module.dashboard_data[measurement]
    return {
      value: value,
      icon: this.getIcon(measurement),
      label: this.translate(measurement.toUpperCase())
    }
  },
  kebabCase: string => string
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase(),
  getValue: function (dataType, value) {
    if (!value) { return value }
    switch (dataType) {
      case this.measurement.CO2:
        return value.toFixed(0) + ' ppm'
      case this.measurement.NOISE:
        return value.toFixed(0) + ' dB'
      case this.measurement.HUMIDITY:
      case 'Battery':
      case 'WiFi':
      case 'Radio':
        return value.toFixed(0) + '%'
      case this.measurement.PRESSURE:
        return value.toFixed(0) + ' mbar'
      case this.measurement.TEMPERATURE:
        return value.toFixed(1) + '°'
      case this.measurement.RAIN:
      case this.measurement.RAIN_PER_HOUR:
      case this.measurement.RAIN_PER_DAY:
        return value.toFixed(1) + ' mm/h'
      case this.measurement.WIND_STRENGTH:
      case this.measurement.GUST_STRENGTH:
        return value.toFixed(0) + ' m/s'
      case this.measurement.WIND_ANGLE:
      case this.measurement.GUST_ANGLE:
        return this.direction(value) + ' | ' + value + '°'
      default:
        return value
    }
  },
  getDirection: function (value) {
    if (value < 11.25) return 'N'
    if (value < 33.75) return 'NNE'
    if (value < 56.25) return 'NE'
    if (value < 78.75) return 'ENE'
    if (value < 101.25) return 'E'
    if (value < 123.75) return 'ESE'
    if (value < 146.25) return 'SE'
    if (value < 168.75) return 'SSE'
    if (value < 191.25) return 'S'
    if (value < 213.75) return 'SSW'
    if (value < 236.25) return 'SW'
    if (value < 258.75) return 'WSW'
    if (value < 281.25) return 'W'
    if (value < 303.75) return 'WNW'
    if (value < 326.25) return 'NW'
    if (value < 348.75) return 'NNW'
    return 'N'
  },
  getIcon: function (dataType) {
    switch (dataType) {
      case this.measurement.CO2:
        return 'fa-lungs'
      case this.measurement.NOISE:
        return 'fa-volume-up'
      case this.measurement.HUMIDITY:
        return 'fa-tint'
      // case this.measurement.PRESSURE:
      // case this.measurement.PRESSURE:
      // case this.measurement.GUST_ANGLE:
      // case this.measurement.GUST_STRENGTH:
      // case this.measurement.WIND:
      // case this.measurement.WIND_ANGLE:
      // case this.measurement.WIND_STRENGTH:
      // return 'fa-tachometer-alt';
      case this.measurement.PRESSURE_TREND:
      case this.measurement.TEMPERATURE_TREND:
        return 'fa-long-arrow-alt-right'
      case 'wifi':
        return 'fa-wifi'
      case 'radio':
        return 'fa-broadcast-tower'
      case 'battery':
        return 'fa-battery-three-quarters'
      default:
        return 'fa-ambulance'
    }
  },
  getStyles: function () {
    return [`${this.name}.css`]
  },
  getTemplate: function () {
    return `${this.name}.njk`
  },
  getTemplateData: function () {
    return {
      loaded: this.loaded,
      showLastMessage: this.config.showLastMessage,
      showBattery: this.config.showBattery,
      showRadio: this.config.showRadio,
      showWiFi: this.config.showWiFi,
      showTrend: this.config.showTrend,
      showIcon: this.config.showIcon,
      showLabel: this.config.showLabel,
      moduleList: this.moduleList,
      fontClassModuleName: this.config.fontClassModuleName,
      fontClassPrimary: this.config.fontClassPrimary,
      fontClassSecondary: this.config.fontClassSecondary,
      fontClassMeasurement: this.config.fontClassMeasurement
    }
  },
  getTranslations: function () {
    return {
      en: 'l10n/en.json',
      de: 'l10n/de.json',
      fr: 'l10n/fr.json',
      cs: 'l10n/cs.json',
      nb: 'l10n/nb.json',
      nn: 'l10n/nn.json'
    }
  },
  socketNotificationReceived: function (notification, payload) {
    const self = this
    Log.debug('received ' + notification)
    if (notification === self.notifications.auth_response) {
      console.log(payload)
      if (payload.status === 'OK') {
        this.sendSocketNotification(self.notifications.data, self.config)
      } else {
        console.log('AUTH FAILED ' + payload.message)
      }
    } else if (notification === self.notifications.data_response) {
      console.log(payload)

      if (payload.status === 'OK') {
        console.log('devices returned')
        const station = payload.payloadReturn[0]
        this.updateModuleList(station)
        this.updateDom(this.config.animationSpeed)
      } else if (payload.status === 'INVALID_TOKEN') {
        // node_module has no valid token, reauthenticate
        console.log('DATA FAILED, refreshing token')
        this.sendSocketNotification(self.notifications.auth, self.config)
      } else {
        console.log('DATA FAILED ' + payload.message)
      }
    }
  }
})
