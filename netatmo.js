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
    hideLoadTimer: false,
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
    fontClassMeasurement: 'xsmall',
  },
  notifications: {
    'auth': 'NETATMO_AUTH',
    'auth_response': 'NETATMO_AUTH_RESPONSE',
    'data': 'NETATMO_DATA',
    'data_response': 'NETATMO_DATA_RESPONSE',
  },
  moduleType: {
    MAIN: "NAMain",
    INDOOR: "NAModule4",
    OUTDOOR: "NAModule1",
    RAIN: "NAModule3",
    WIND: "NAModule2"
  },
  // init method
  start: function () {
    let self = this
    Log.info(`Starting module: ${this.name}`)
    self.loaded = false
    self.moduleList = []

		//get a new token at start-up. When receive, GET_CAMERA_EVENTS will be requested
    setTimeout(function() {
			self.sendSocketNotification(self.notifications.data, self.config);
		}, this.config.initialDelay *1000);

		//set auto-update
    setInterval( function () {
			//request directly the data, with the previous token. When the token will become invalid (error 403), it will be requested again
			self.sendSocketNotification(self.notifications.data, self.config);
		}, this.config.updateInterval * 60 * 1000 + this.config.initialDelay *1000);
  },
  updateModuleList: function (station) {
    const moduleList = []

    moduleList.push(this.getModule(station))

    station.modules.forEach(function (module) {
      moduleList.push(this.getModule(module))
    }.bind(this))

    if (station.reachable)
      this.lastUpdate = station.dashboard_data.time_utc;
    this.loaded = true
    if (JSON.stringify(this.moduleList) === JSON.stringify(moduleList)) {
      return
    }
    this.moduleList = moduleList
    this.updateDom(this.config.animationSpeed)
  },
  getModule: function(module){
    let result = {}

    result.name = module.module_name
    result.measurementList = []

    if (!module.reachable) return result

//TODO check module.reachable
    let primaryType = ''
    let primaryValue = ''
    let secondaryType = ''
    let secondaryValue = ''

    switch (module.type) {
      case this.moduleType.MAIN:
        // break; fallthrough
      case this.moduleType.INDOOR:
        secondaryType = 'CO2';
        secondaryValue = module.dashboard_data[secondaryType];
        let status = 'good';
        if(secondaryValue > 800) status = 'bad'
        if(secondaryValue > 1600) status = 'bad'
        result.secondary = {visualClass: status, value: this.formatter.value(secondaryType, secondaryValue), class: secondaryType}
        // break; fallthrough
      case this.moduleType.OUTDOOR:
        primaryType = 'Temperature'
        primaryValue = module.dashboard_data?module.dashboard_data[primaryType]:''
        result.primary = {unit: '', value: this.formatter.value(primaryType, primaryValue), class: primaryType}
        result.measurementList.push({value: module.dashboard_data['temp_trend'], icon: 'fa-long-arrow-alt-right', label: 'temp_trend'})
        result.measurementList.push({value: module.dashboard_data['Humidity'], icon: 'fa-tint', label: 'humidity'})
        break;
      case this.moduleType.WIND:
        primaryType = 'WindStrength'
        primaryValue = module.dashboard_data?module.dashboard_data[primaryType]:''
        result.primary = {unit: 'm/s', value: primaryValue, class: primaryType}
        secondaryType = 'WindAngle'
        secondaryValue = module.dashboard_data[type];
        result.secondary = {visualClass: 'xlarge wi wi-direction-up', value: this.formatter.value(secondaryType, secondaryValue), class: secondaryType}
  //         $('<div/>').addClass('visual xlarge wi wi-direction-up').css('transform', 'rotate(' + value + 'deg)')
        result.measurementList.push({value: module.dashboard_data['GustStrength'], icon: 'fa-tachometer-alt', label: 'GustStrength'})
        result.measurementList.push({value: module.dashboard_data['GustAngle'], icon: 'fa-tachometer-alt', label: 'GustAngle'})
        break;
      case this.moduleType.RAIN:
        primaryType = 'Rain'
        primaryValue = module.dashboard_data?module.dashboard_data[primaryType]:''
        result.primary = {unit: 'mm/h', value: primaryValue, class: primaryType}
        result.measurementList.push({value: module.dashboard_data['sum_rain_1'], icon: 'fa-cloud-rain', label: 'per_hour'})
        result.measurementList.push({value: module.dashboard_data['sum_rain_24'], icon: 'fa-cloud-rain', label: 'per_day'})
        break;
      default:
        break;
    }
    if (module.type === this.moduleType.MAIN){
      result.measurementList.push({value: module.dashboard_data['Pressure'], icon: 'fa-tachometer-alt', label: 'pressure'})
      result.measurementList.push({value: module.dashboard_data?module.dashboard_data['pressure_trend']:'', icon: 'fa-long-arrow-alt-right', label: 'pressure_trend'})
      result.measurementList.push({value: module.dashboard_data['Noise'], icon: 'fa-tachometer-alt', label: 'noise'})
      result.measurementList.push({value: module.wifi_status, icon: this.formatter.icon('wifi'), label: this.translate('wifi'.toUpperCase())})
    } else {
      result.measurementList.push({value: module.rf_status, icon: this.formatter.icon('radio'), label: this.translate('radio'.toUpperCase())})
      result.measurementList.push({value: module.battery_percent, icon: this.formatter.icon('battery'), label: this.translate('battery'.toUpperCase())})
    }
      //       this.translate.bind(this)(type.toUpperCase())
    return result
  },
  formatter: {
    value: function(dataType, value) {
      if(!value)
        return value;
      switch (dataType) {
        case 'CO2':
          return value.toFixed(0) + ' ppm';
        case 'Noise':
          return value.toFixed(0) + ' dB';
        case 'Humidity':
        case 'Battery':
        case 'WiFi':
        case 'Radio':
          return value.toFixed(0) + '%';
        case 'Pressure':
          return value.toFixed(0) + ' mbar';
        case 'Temperature':
          return value.toFixed(1) + '°';
        case 'Rain':
        case 'sum_rain_24':
        case 'sum_rain_1':
          return value.toFixed(1) + ' mm/h';
        case 'WindStrength':
        case 'GustStrength':
          return value.toFixed(0) + ' m/s';
        case 'WindAngle':
        case 'GustAngle':
          return this.direction(value) + ' | ' + value + '°';
        default:
          return value;
      }
    },
    direction: function(value){
      if(value < 11.25) return 'N';
      if(value < 33.75) return 'NNE';
      if(value < 56.25) return 'NE';
      if(value < 78.75) return 'ENE';
      if(value < 101.25) return 'E';
      if(value < 123.75) return 'ESE';
      if(value < 146.25) return 'SE';
      if(value < 168.75) return 'SSE';
      if(value < 191.25) return 'S';
      if(value < 213.75) return 'SSW';
      if(value < 236.25) return 'SW';
      if(value < 258.75) return 'WSW';
      if(value < 281.25) return 'W';
      if(value < 303.75) return 'WNW';
      if(value < 326.25) return 'NW';
      if(value < 348.75) return 'NNW';
      return 'N';
    },
    // rain: function(){
    //   return '';
    // },
    icon: function(dataType) {
      switch (dataType) {
        case 'CO2':
          return 'wi-na';
        case 'Noise':
          return 'wi-na';
        case 'Humidity':
          return 'wi-humidity';
        case 'Pressure':
          return 'wi-barometer';
        case 'Temperature':
          return 'wi-thermometer';
        case 'Rain':
          return 'wi-raindrops';
        case 'Wind':
          return 'wi-na';
        case 'wifi':
          return 'fa-wifi';
        case 'radio':
          return 'fa-broadcast-tower';
        case 'battery':
          return 'fa-battery-three-quarters';
        default:
          return '';
      }
      return '';
    },
  },
  // getScripts: function() {
  //   return [
  //     'moment.js'
  //   ];
  // },
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
      fontClassMeasurement: this.config.fontClassMeasurement,
    }
  },
  getTranslations: function() {
    return {
      en: 'l10n/en.json',
      de: 'l10n/de.json',
      fr: 'l10n/fr.json',
      cs: 'l10n/cs.json',
      nb: 'l10n/nb.json',
      nn: 'l10n/nn.json'
    };
  },
  socketNotificationReceived: function (notification, payload) {
    const self = this
    Log.debug('received ' + notification)
    if (notification === self.notifications.auth_response) {
      console.log(payload)
      if(payload.status === 'OK') {
        this.sendSocketNotification(self.notifications.data, self.config);
      } else {
        console.log("AUTH FAILED " + payload.message)
      }
    } else if (notification === self.notifications.data_response) {
      console.log(payload)

      if (payload.status === 'OK') {
        console.log("devices returned")
        var station = payload.payloadReturn[0];
        this.updateModuleList(station)
        this.updateDom(this.config.animationSpeed);
      } else if(payload.status === 'INVALID_TOKEN') {
        console.log("DATA FAILED, refreshing token")
        this.sendSocketNotification(self.notifications.auth, self.config);
      } else {
        console.log("DATA FAILED " + payload.message)
      }
    }
  }
});
