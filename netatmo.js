/* Magic Mirror
 * Module: Netatmo
 *
 * By Christopher Fenner http://github.com/CFenner
 * MIT Licensed.
 */
 /* global $, Q, moment, Module, Log */
Module.register('netatmo', {
  // default config
  defaults: {
    username: null,
    password: null,
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
    apiBase: 'api.netatmo.com',
    authEndpoint: '/oauth2/token',
    dataEndpoint: '/api/getstationsdata',
    fontClassModuleName: 'small',
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

    moduleList.push(getModule(station))
    station.modules.forEach(function (module) {
      moduleList.push(getModule(module))
    }.bind(this))
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

    if (module.type in [this.moduleType.MAIN, this.moduleType.INDOOR, this.moduleType.OUTDOOR]){
      result.temperatureTrend = module.dashboard_data?module.dashboard_data['temp_trend']:'';
      result.humidity = module.dashboard_data?module.dashboard_data['Humidity']:''
    } else if (module.type === this.moduleType.WIND) {
      result.gustStrength = module.dashboard_data['GustStrength']
      result.gustAngle = module.dashboard_data['GustAngle']
    } else if (module.type === this.moduleType.RAIN) {
      result.raimPerHour = module.dashboard_data['sum_rain_1']
      result.rainPerDay = module.dashboard_data['sum_rain_24']
    }

    if (module.type === this.moduleType.MAIN){
      result.pressure = module.dashboard_data['Pressure']
      result.pressureTrend = module.dashboard_data?module.dashboard_data['pressure_trend']:'';
      result.noise = module.dashboard_data['Noise']
      result.wifi = module.wifi_status
    } else {
      result.radio = module.rf_status
      result.battery = module.battery_percent
    }
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
    rain: function(){
      return '';
    },
    clazz: function(dataType) {
      /* unused
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
        default:
          return '';
      }*/
      return '';
    }
  },
  render: function(device){
    var sResult = $('<div/>').addClass('modules').addClass('bubbles');
    var aOrderedModuleList = this.config.moduleOrder && this.config.moduleOrder.length > 0 ?
      this.config.moduleOrder :
      null;

    if (aOrderedModuleList) {
      for (var moduleName of aOrderedModuleList) {
        if (device.module_name === moduleName) {
          sResult.append(this.module(device));
        } else {
          for (var module of device.modules) {
            if (module.module_name === moduleName) {
              sResult.append(this.module(module));
              break;
            }
          }
        }
      }
    } else {
      // render station data (main station)
      sResult.append(this.module(device));
      // render module data (connected modules)
      for (var cnt = 0; cnt < device.modules.length; cnt++) {
        sResult.append(this.module(device.modules[cnt]));
      }
    }
    return sResult;
  },
  // module: function(module){
  //   var result = $('<div/>').addClass('module').append(
  //     $('<div/>').addClass(`name ${this.config.fontClassModuleName}`).append(module.module_name)
  //   ).append(
  //     $('<div/>').append(
  //       $('<table/>').addClass('').append(
  //         $('<tr/>').append(
  //           this.primary(module)
  //         ).append(
  //           this.secondary(module)
  //         ).append(
  //           this.data2(module)
  //         )))
  //   );
  //   return result[0].outerHTML;
  // },
  // primary: function(module){
  //   var result = $('<td/>').addClass('primary');
  //   var type;
  //   var value;
  //   switch(module.type){
  //     case this.moduleType.MAIN:
  //     case this.moduleType.INDOOR:
  //     case this.moduleType.OUTDOOR:
  //       type = 'Temperature';
  //       value = module.dashboard_data?module.dashboard_data[type]:'';
  //       $('<div/>').addClass(type).append(
  //         $('<div/>').addClass('large light bright').append(this.formatter.value(type, value))
  //       ).appendTo(result);
  //       break;
  //     case this.moduleType.WIND:
  //       type = 'WindStrength';
  //       value = module.dashboard_data[type];
  //       $('<div/>').addClass(type).append(
  //         $('<div/>').addClass('large light bright').append(value)
  //       ).append(
  //         $('<div/>').addClass('xsmall').append('m/s')
  //       ).appendTo(result);
  //       break;
  //     case this.moduleType.RAIN:
  //       type = 'Rain';
  //       value = module.dashboard_data[type];
  //       $('<div/>').addClass(type).append(
  //         $('<div/>').addClass('large light bright').append(value)
  //       ).append(
  //         $('<div/>').addClass('xsmall').append('mm/h')
  //       ).appendTo(result);
  //       break;
  //     default:
  //   }
  //   return result;
  // },
  // secondary: function(module){
  //   var result = $('<td/>').addClass('secondary');
  //   switch(module.type){
  //     case this.moduleType.MAIN:
  //     case this.moduleType.INDOOR:
  //       var type = 'CO2';
  //       var value = module.dashboard_data[type];
  //       var status = value > 1600?'bad':value > 800?'average':'good';

  //       $('<div/>').addClass(type).append(
  //         $('<div/>').addClass('visual').addClass(status)
  //       ).append(
  //         $('<div/>').addClass('small value').append(this.formatter.value(type, value))
  //       ).appendTo(result);
  //       break;
  //     case this.moduleType.WIND:
  //       type = 'WindAngle';
  //       value = module.dashboard_data[type];

  //       $('<div/>').addClass(type).append(
  //         $('<div/>').addClass('visual xlarge wi wi-direction-up').css('transform', 'rotate(' + value + 'deg)')
  //       ).append(
  //         $('<div/>').addClass('small value').append(this.formatter.value(type, value))
  //       ).appendTo(result);
  //       break;
  //     case this.moduleType.OUTDOOR:
  //     case this.moduleType.RAIN:
  //     default:
  //       break;
  //   }
  //   return result;
  // },
  // data2: function(module){
  //   var result = $('<td/>').addClass('data');
  //   switch(module.type){
  //     case this.moduleType.MAIN:
  //       this.addTemperatureTrend(result, module);
  //       this.addHumidity(result, module);
  //       this.addPressure(result, module);
  //       this.addPressureTrend(result, module);
  //       this.addNoise(result, module);
  //       this.addWiFi(result, module);
  //       //result += this.addData('max_temp', module.dashboard_data['max_temp']);
  //       //result += this.addData('min_temp', module.dashboard_data['min_temp']);
  //       break;
  //     case this.moduleType.INDOOR:
  //       this.addTemperatureTrend(result, module);
  //       this.addHumidity(result, module);
  //       this.addBattery(result, module);
  //       this.addRadio(result, module);
  //       this.addLastSeen(result, module);
  //       break;
  //     case this.moduleType.OUTDOOR:
  //       this.addTemperatureTrend(result, module);
  //       this.addHumidity(result, module);
  //       this.addBattery(result, module);
  //       this.addRadio(result, module);
  //       this.addLastSeen(result, module);
  //       break;
  //     case this.moduleType.WIND:
  //       this.addData(result, 'GustStrength', module.dashboard_data['GustStrength']);
  //       this.addData(result, 'GustAngle', module.dashboard_data['GustAngle']);
  //       this.addBattery(result, module);
  //       this.addRadio(result, module);
  //       this.addLastSeen(result, module);
  //       break;
  //     case this.moduleType.RAIN:
  //       this.addData(result, 'sum_rain_1', module.dashboard_data['sum_rain_1']);
  //       this.addData(result, 'sum_rain_24', module.dashboard_data['sum_rain_24']);
  //       this.addBattery(result, module);
  //       this.addRadio(result, module);
  //       this.addLastSeen(result, module);
  //       break;
  //     default:
  //       break;
  //   }
  //   return result;
  // },
  // addTemperatureTrend: function(parent, module){
  //   var value = module.dashboard_data?module.dashboard_data['temp_trend']:'';
  //   if(!value)
  //     value = 'UNDEFINED'
  //   if(this.config.showTrend)
  //     this.addData(parent, 'temp_trend', this.translate.bind(this)(value.toUpperCase()));
  // },
  // addPressure: function(parent, module){
  //   return this.addData(parent, 'Pressure', module.dashboard_data['Pressure']);
  // },
  // addPressureTrend: function(parent, module){
  //   var value = module.dashboard_data?module.dashboard_data['pressure_trend']:'';
  //   if(!value)
  //     value = 'UNDEFINED'
  //   if(this.config.showTrend)
  //     this.addData(parent, 'pressure_trend', this.translate.bind(this)(value.toUpperCase()));
  // },
  // addHumidity: function(parent, module){
  //   return this.addData(parent, 'Humidity', module.dashboard_data?module.dashboard_data['Humidity']:'');
  // },
  // addNoise: function(parent, module){
  //   return this.addData(parent, 'Noise', module.dashboard_data['Noise']);
  // },
  // addBattery: function(parent, module){
  //   if(this.config.showBattery)
  //     this.addData(parent, 'Battery', module.battery_percent);
  // },
  // addRadio: function(parent, module){
  //   if(this.config.showRadio)
  //     this.addData(parent, 'Radio', module.rf_status);
  // },
  // addWiFi: function(parent, module){
  //   if(this.config.showWiFi)
  //     this.addData(parent, 'WiFi', module.wifi_status);
  // },
  // addLastSeen: function(parent, module){
  //   var duration = Date.now() / 1000 - module.last_message;
  //   if(this.config.showLastMessage && duration > this.config.lastMessageThreshold){
  //     $('<div/>')
  //       .addClass('small flash')
  //       .append(
  //         this.translate.bind(this)("LAST_MESSAGE")
  //         + ': '
  //         + moment.unix(module.last_message).fromNow()
  //       )
  //       .appendTo(parent);
  //   }
  // },
  // addData: function(parent, type, value){
  //   return $('<div/>')
  //     .addClass('small')
  //     .append(
  //       this.translate.bind(this)(type.toUpperCase())
  //       + ': '
  //       + this.formatter.value(type, value)
  //     )
  //     .appendTo(parent);
  // },
  getScripts: function() {
    return [
      'moment.js'
    ];
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
      // flip: this.data.position.startsWith('left'),
      // loaded: this.loaded,
      showLastMessage: this.config.showLastMessage,
      showBattery: this.config.showBattery,
      showRadio: this.config.showRadio,
      showWiFi: this.config.showWiFi,
      showTrend: this.config.showTrend,
      moduleList: this.moduleList
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
  // getDom: function() {
  //   var dom = $('<div/>').addClass('netatmo');
  //   if(this.dom){
  //     dom.append(
  //       this.dom
  //     ).append(
  //       $('<div/>')
  //         .addClass('updated xsmall')
  //         .append(moment.unix(this.lastUpdate).fromNow())
  //     );
  //     if(!this.config.hideLoadTimer){
  //       dom.append($(
  //         '<svg class="loadTimer" viewbox="0 0 250 250">' +
  //         '  <path class="border" transform="translate(125, 125)"/>' +
  //         '  <path class="loader" transform="translate(125, 125) scale(.84)"/>' +
  //         '</svg>'
  //       ));
  //     }
  //   }else{
  //     dom.append($(
  //       '<svg class="loading" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">' +
  //       '  <circle class="outer"></circle>' +
  //       '  <circle class="inner">' +
  //       '    <animate attributeName="stroke-dashoffset" dur="5s" repeatCount="indefinite" from="0" to="502"></animate>' +
  //       '    <animate attributeName="stroke-dasharray" dur="5s" repeatCount="indefinite" values="150.6 100.4;1 250;150.6 100.4"></animate>' +
  //       '  </circle>' +
  //       '</svg>'
  //     ));
  //   }
  //   return dom[0];
  // },
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
        var device = payload.payloadReturn[0];
        this.lastUpdate = device.dashboard_data.time_utc;
        this.updateModuleList(device)
        // render modules
        // this.dom = this.render(device);
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
