/* MagicMirror²
 * Module: MMM-Netatmo
 *
 * By Christopher Fenner https://github.com/CFenner
 * MIT Licensed.
 */
/* global Module */
Module.register('netatmo', {
  // default config
  defaults: {
    initialDelay: 0,
    updateInterval: 3, // every 3 minutes, refresh interval on netatmo is 10 minutes
    animationSpeed: 1000,
    design: 'classic', // or bubbles
    horizontal: true,
    lastMessageThreshold: 600, // in seconds (10 minutes)
    showLastMessage: true,
    showBattery: true,
    showRadio: true,
    showWiFi: true,
    showTrend: true,
    showMeasurementIcon: true,
    showMeasurementLabel: true,
    showStationName: true,
    showModuleNameOnTop: false,
    apiBase: 'api.netatmo.com',
    authEndpoint: '/oauth2/token',
    dataEndpoint: '/api/getstationsdata',
    fontClassModuleName: 'xsmall',
    fontClassPrimary: 'large',
    fontClassSecondary: 'xsmall',
    fontClassMeasurement: 'xsmall',
    thresholdCO2Average: 800,
    thresholdCO2Bad: 1800,
    mockData: false,
  },
  notifications: {
    AUTH: 'NETATMO_AUTH',
    AUTH_RESPONSE: 'NETATMO_AUTH_RESPONSE',
    DATA: 'NETATMO_DATA',
    DATA_RESPONSE: 'NETATMO_DATA_RESPONSE',
  },
  moduleType: {
    MAIN: 'NAMain',
    INDOOR: 'NAModule4',
    OUTDOOR: 'NAModule1',
    RAIN: 'NAModule3',
    WIND: 'NAModule2',
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
    RAIN_PER_DAY: 'sum_rain_24',
  },
  // init method
  start () {
    Log.info(`Starting module: ${this.name}`)
    this.loaded = false
    this.moduleList = []

    // get a new token at start-up.
    setTimeout(() => {
      // best way is using initialize at start and if auth OK --> fetch data
      this.sendSocketNotification('INIT', this.config)
    }, this.config.initialDelay * 1000)

    // set auto-update
    setInterval(() => {
      this.sendSocketNotification(this.notifications.DATA)
    }, this.config.updateInterval * 60 * 1000 + this.config.initialDelay * 1000)
  },
  updateModuleList (stationList) {
    let moduleList = []

    for (const station of stationList) {
      moduleList.push(this.getModule(station, station.home_name))

      station.modules.forEach(function (module) {
        moduleList.push(this.getModule(module, station.home_name))
      }.bind(this))

      if (station.reachable) { this.lastUpdate = station.dashboard_data.time_utc }
    }
    this.loaded = true
    if (JSON.stringify(this.moduleList) === JSON.stringify(moduleList)) {
      return
    }
    // reorder modules
    if (this.config.moduleOrder && this.config.moduleOrder.length > 0) {
      const reorderedModuleList = []
      for (const moduleName of this.config.moduleOrder) {
        for (const module of moduleList) {
          if (module.name === moduleName) {
            reorderedModuleList.push(module)
          }
        }
      }
      moduleList = reorderedModuleList
    }
    this.moduleList = moduleList
  },
  getModule (module, stationName) {
    const result = {}

    result.name = module.module_name
    if (this.config.showStationName) {
      result.name = `${stationName} - ${result.name}`
    }
    result.measurementList = []

    if (!module.reachable) {
      let measurement = ''
      if (module.type === this.moduleType.MAIN) {
        measurement = 'wifi'
      } else {
        measurement = 'radio'
      }

      result.measurementList.push({
        name: measurement,
        value: this.getValue(measurement, 0),
        unit: this.getUnit(measurement),
        icon: `${this.getIcon(measurement, 0)} flash red`,
        label: this.translate(measurement.toUpperCase()),
      })

      return result
    }

    // TODO check module.reachable
    let primaryType = ''
    let primaryValue = ''
    let secondaryType = ''
    let secondaryValue = ''

    // add module sensor measurements
    switch (module.type) {
      case this.moduleType.MAIN:
        result.measurementList.push(this.getMeasurement(module, this.measurement.PRESSURE))
        if (this.config.showTrend) { result.measurementList.push(this.getMeasurement(module, this.measurement.PRESSURE_TREND)) }
        result.measurementList.push(this.getMeasurement(module, this.measurement.NOISE))
        // break; fallthrough
      case this.moduleType.INDOOR:
        if (this.config.design === 'bubbles') {
          secondaryType = this.measurement.CO2
          secondaryValue = module.dashboard_data[secondaryType]
          result.secondary = {
            value: this.getValue(secondaryType, secondaryValue),
            unit: this.getUnit(secondaryType),
            class: this.kebabCase(secondaryType),
            visualClass: this.getCO2Status(secondaryValue),
          }
        } else {
          result.measurementList.push(this.getMeasurement(module, this.measurement.CO2))
        }
        // break; fallthrough
      case this.moduleType.OUTDOOR:
        if (this.config.design === 'bubbles') {
          primaryType = this.measurement.TEMPERATURE
          primaryValue = module.dashboard_data ? module.dashboard_data[primaryType] : ''
          result.primary = {
            value: this.getValue(primaryType, primaryValue),
            unit: this.getUnit(primaryType),
            class: this.kebabCase(primaryType),
          }
        } else {
          result.measurementList.push(this.getMeasurement(module, this.measurement.TEMPERATURE))
        }
        if (this.config.showTrend) { result.measurementList.push(this.getMeasurement(module, this.measurement.TEMPERATURE_TREND)) }
        result.measurementList.push(this.getMeasurement(module, this.measurement.HUMIDITY))
        break
      case this.moduleType.WIND:
        if (this.config.design === 'bubbles') {
          primaryType = this.measurement.WIND_STRENGTH
          primaryValue = module.dashboard_data ? module.dashboard_data[primaryType] : ''
          result.primary = {
            value: this.getValue(primaryType, primaryValue),
            unit: this.getUnit(primaryType),
            class: this.kebabCase(primaryType),
          }
          secondaryType = this.measurement.WIND_ANGLE
          secondaryValue = module.dashboard_data[secondaryType]
          result.secondary = {
            value: this.getValue(secondaryType, secondaryValue),
            unit: this.getUnit(secondaryType),
            class: this.kebabCase(secondaryType),
            visualClass: 'xlarge wi wi-direction-up',
          }
        } else {
          result.measurementList.push(this.getMeasurement(module, this.measurement.WIND_STRENGTH))
          result.measurementList.push(this.getMeasurement(module, this.measurement.WIND_ANGLE))
        }
        //         $('<div/>').addClass('visual xlarge wi wi-direction-up').css('transform', 'rotate(' + value + 'deg)')
        result.measurementList.push(this.getMeasurement(module, this.measurement.GUST_STRENGTH))
        result.measurementList.push(this.getMeasurement(module, this.measurement.GUST_ANGLE))
        break
      case this.moduleType.RAIN:
        if (this.config.design === 'bubbles') {
          primaryType = this.measurement.RAIN
          primaryValue = module.dashboard_data ? module.dashboard_data[primaryType] : ''
          result.primary = {
            value: this.getValue(primaryType, primaryValue),
            unit: this.getUnit(primaryType),
            class: this.kebabCase(primaryType),
          }
        } else {
          result.measurementList.push(this.getMeasurement(module, this.measurement.RAIN))
        }
        result.measurementList.push(this.getMeasurement(module, this.measurement.RAIN_PER_HOUR))
        result.measurementList.push(this.getMeasurement(module, this.measurement.RAIN_PER_DAY))
        break
      default:
        break
    }
    // add module specific measurements
    if (module.type === this.moduleType.MAIN) {
      if (this.config.showWiFi) { result.measurementList.push(this.getMeasurement(module, 'wifi', module.wifi_status)) }
    } else {
      if (this.config.showRadio) { result.measurementList.push(this.getMeasurement(module, 'radio', module.rf_status)) }
      if (this.config.showBattery) { result.measurementList.push(this.getMeasurement(module, 'battery', module.battery_percent)) }
    }
    // reorder measurements
    if (this.config.dataOrder && this.config.dataOrder.length > 0) {
      const reorderedMeasurementList = []
      for (const measurementName of this.config.dataOrder) {
        for (const measurement of result.measurementList) {
          if (measurement.name === measurementName) {
            reorderedMeasurementList.push(measurement)
          }
        }
      }
      result.measurementList = reorderedMeasurementList
    }
    return result
  },
  getMeasurement (module, measurement, value) {
    value = value || module.dashboard_data[measurement]
    if (measurement === this.measurement.TEMPERATURE_TREND || measurement === this.measurement.PRESSURE_TREND) {
      value = value || 'undefined'
    }

    return {
      name: measurement,
      value: this.getValue(measurement, value),
      unit: this.getUnit(measurement),
      icon: this.getIcon(measurement, value),
      label: this.translate(measurement.toUpperCase()),
    }
  },
  kebabCase (name) {
    return name.replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase()
  },
  getValue (measurement, value) {
    if (!value) { return value }
    switch (measurement) {
      case this.measurement.CO2:
        return value.toFixed(0)// + '&nbsp;ppm'
      case this.measurement.NOISE:
        return value.toFixed(0)// + '&nbsp;dB'
      case this.measurement.HUMIDITY:
      case 'battery':
      case 'wifi':
      case 'radio':
        return value.toFixed(0)// + '%'
      case this.measurement.PRESSURE:
        return value.toFixed(0)// + '&nbsp;mbar'
      case this.measurement.TEMPERATURE:
        return value.toFixed(1)// + '°C'
      case this.measurement.RAIN:
      case this.measurement.RAIN_PER_HOUR:
      case this.measurement.RAIN_PER_DAY:
        return value.toFixed(1)// + '&nbsp;mm/h'
      case this.measurement.WIND_STRENGTH:
      case this.measurement.GUST_STRENGTH:
        return value.toFixed(0)// + '&nbsp;m/s'
      case this.measurement.WIND_ANGLE:
      case this.measurement.GUST_ANGLE:
        return `${this.getDirection(value)}&nbsp;|&nbsp;${value}`// + '°'
      case this.measurement.TEMPERATURE_TREND:
      case this.measurement.PRESSURE_TREND:
        return this.translate(value.toUpperCase())
      default:
        return value
    }
  },
  getUnit (measurement) {
    switch (measurement) {
      case this.measurement.CO2:
        return 'ppm'
      case this.measurement.NOISE:
        return 'dB'
      case this.measurement.HUMIDITY:
      case 'battery':
      case 'wifi':
      case 'radio':
        return '%'
      case this.measurement.PRESSURE:
        return 'mbar'
      case this.measurement.TEMPERATURE:
        return '°C'
      case this.measurement.RAIN:
      case this.measurement.RAIN_PER_HOUR:
      case this.measurement.RAIN_PER_DAY:
        return 'mm/h'
      case this.measurement.WIND_STRENGTH:
      case this.measurement.GUST_STRENGTH:
        return 'm/s'
      case this.measurement.WIND_ANGLE:
      case this.measurement.GUST_ANGLE:
        return '°'
      default:
        return ''
    }
  },
  getDirection (value) {
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
  getCO2Status (value) {
    if (!value || value === 'undefined' || value < 0) return 'undefined'
    if (value >= this.config.thresholdCO2Bad) return 'bad'
    if (value >= this.config.thresholdCO2Average) return 'average'
    return 'good'
  },
  getIcon (dataType, value) {
    switch (dataType) {
      // case this.measurement.CO2:
      //   return 'fa-lungs'
      case this.measurement.NOISE:
        return 'fa-volume-up'
      case this.measurement.HUMIDITY:
        return 'fa-tint'
      case this.measurement.PRESSURE:
        return 'fa-tachometer-alt'
      case this.measurement.GUST_STRENGTH:
      case this.measurement.WIND_STRENGTH:
        return 'fa-wind'
      // case this.measurement.GUST_ANGLE:
      // case this.measurement.WIND_ANGLE:
      case this.measurement.PRESSURE_TREND:
      case this.measurement.TEMPERATURE_TREND:
        return this.getTrendIcon(value)
      case 'wifi':
        return 'fa-wifi'
      case 'radio':
        return 'fa-broadcast-tower'
      case 'battery':
        return this.getBatteryIcon(value)
      default:
        return ''
    }
  },
  getTrendIcon (value) {
    if (value === 'stable') return 'fa-chevron-circle-right'
    if (value === 'down') return 'fa-chevron-circle-down'
    if (value === 'up') return 'fa-chevron-circle-up'
    if (value === 'undefined') return 'fa-times-circle'
  },
  getBatteryIcon (value) {
    if (value > 80) return 'fa-battery-full'
    if (value > 60) return 'fa-battery-three-quarters'
    if (value > 40) return 'fa-battery-half'
    if (value > 20) return 'fa-battery-quarter'
    return 'fa-battery-empty flash red'
  },
  getStyles () {
    return [`${this.name}.${this.config.design}.css`]
  },
  getTemplate () {
    return `${this.name}.${this.config.design}.njk`
  },
  getTemplateData () {
    return {
      loaded: this.loaded,
      showLastMessage: this.config.showLastMessage,
      showBattery: this.config.showBattery,
      showRadio: this.config.showRadio,
      showWiFi: this.config.showWiFi,
      showTrend: this.config.showTrend,
      showMeasurementIcon: this.config.showMeasurementIcon,
      showMeasurementLabel: this.config.showMeasurementLabel,
      showModuleNameOnTop: this.config.showModuleNameOnTop,
      horizontal: this.config.horizontal,
      moduleList: this.moduleList,
      fontClassModuleName: this.config.fontClassModuleName,
      fontClassPrimary: this.config.fontClassPrimary,
      fontClassSecondary: this.config.fontClassSecondary,
      fontClassMeasurement: this.config.fontClassMeasurement,
      labelLoading: this.translate('LOADING'),
    }
  },
  getTranslations () {
    return {
      en: 'l10n/en.json', // fallback language
      cs: 'l10n/cs.json',
      de: 'l10n/de.json',
      fr: 'l10n/fr.json',
      hu: 'l10n/hu.json',
      nb: 'l10n/nb.json',
      nn: 'l10n/nn.json',
      ru: 'l10n/ru.json',
      sv: 'l10n/sv.json',
    }
  },
  socketNotificationReceived (notification, payload) {
    Log.debug(`Netatmo: received ${notification}`)
    switch (notification) {
      case this.notifications.AUTH_RESPONSE:
        if (payload.status === 'OK') {
          console.log('Netatmo: AUTH OK')
          this.sendSocketNotification(this.notifications.DATA)
        } else {
          console.error(`Netatmo: AUTH FAILED ${payload.message}`)
        }
        break
      case this.notifications.DATA_RESPONSE:
        if (payload.status === 'OK') {
          console.log('Devices %o', payload.payloadReturn)
          const stationList = payload.payloadReturn
          this.updateModuleList(stationList)
          this.updateDom(this.config.animationSpeed)
        } else if (payload.status === 'INVALID_TOKEN') {
          // node_module has no valid token, reauthenticate
          console.error('DATA FAILED, refreshing token')
          // i'm not agree with this... can have error 403 loop
          // --> managed with node_helper
          // this.sendSocketNotification(this.notifications.AUTH)
        } else {
          console.error(`Netatmo: DATA FAILED ${payload.message}`)
        }
        break
    }
  },
})
