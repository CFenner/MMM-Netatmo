/* Magic Mirror
 * Module: Netatmo
 *
 * By Christopher Fenner http://github.com/CFenner
 * MIT Licensed.
 */
 /* eslint-disable max-len */
 /* global $, Q, moment, Module, Log */
Module.register('netatmo', {
  // default config,
  defaults: {
    refreshToken: null,
    updateInterval: 3, // every 3 minutes, refresh interval on netatmo is 10 minutes
    animationSpeed: 1000,
    design: 'bubbles',
    hideLoadTimer: false,
    api: {
      base: 'https://api.netatmo.com/',
      authEndpoint: 'oauth2/token',
      authPayload: 'grant_type=refresh_token&refresh_token={0}&client_id={1}&client_secret={2}',
      dataEndpoint: 'api/getstationsdata',
      dataPayload: 'access_token={0}'
    }
  },
  // init method
  start: function() {
    Log.info('Starting module: ' + this.name);
    this.α = 0;
    // set interval for reload timer
    this.t = this.config.updateInterval * 60 * 1000 / 360;
    // run timer
    this.updateLoad();
  },
  updateLoad: function() {
    // Log.info(this.name + " refresh triggered");
    var that = this;
    return Q.fcall(
      this.load.token.bind(that),
      this.renderError.bind(that)
    ).then(
      this.load.data.bind(that),
      this.renderError.bind(that)
    ).then(
      this.renderAll.bind(that)
    ).done(
      this.updateWait.bind(that)
    );
  },
  updateWait: function() {
    this.α++;
    this.α %= 360;
    var r = (this.α * Math.PI / 180);
    var x = Math.sin(r) * 125;
    var y = Math.cos(r) * -125;
    var mid = (this.α > 180) ? 1 : 0;
    var anim = 'M 0 0 v -125 A 125 125 1 ' +
       mid + ' 1 ' +
       x + ' ' +
       y + ' z';

    var loader = $('.netatmo .loadTimer .loader');
    if (loader.length > 0) {
      loader.attr('d', anim);
    }
    var border = $('.netatmo .loadTimer .border');
    if (border.length > 0) {
      border.attr('d', anim);
    }
    if (r === 0) {
      // refresh data
      this.updateLoad();
    } else {
      // wait further
      setTimeout(this.updateWait.bind(this), this.t);
    }
  },
  load: {
    token: function() {
      /* eslint-disable new-cap */
      return Q($.ajax({
        type: 'POST',
        url: this.config.api.base + this.config.api.authEndpoint,
        data: this.config.api.authPayload.format(
            this.config.refreshToken,
            this.config.clientId,
            this.config.clientSecret)
      }));
      /* eslint-enable new-cap */
    },
    data: function(data) {
      /* eslint-disable new-cap */
      // Log.info(this.name + " token loaded "+data.access_token);
      this.config.refreshToken = data.refresh_token;
      // call for station data
      return Q($.ajax({
        url: this.config.api.base + this.config.api.dataEndpoint,
        data: this.config.api.dataPayload.format(data.access_token)
      }));
      /* eslint-enable new-cap */
    }
  },
  renderAll: function(data) {
    /* eslint-disable new-cap */
    var device = data.body.devices[0];
    this.lastUpdate = device.dashboard_data.time_utc;
    // Log.info(this.name + " data loaded, updated "+moment(new Date(1000*device.dashboard_data.time_utc)).fromNow());


    device.modules.push({
      "type": "NAModule2",
      "dashboard_data": {
          "WindAngle": 221,
          "WindStrength": 2,
          "GustAngle": 208,
          "GustStrength": 4,
          "time_utc": 1462745962,
          "WindHistoric": [{
              "WindStrength": 5,
              "WindAngle": 43,
              "time_utc": 1462742585
          }, {
              "WindStrength": 5,
              "WindAngle": 174,
              "time_utc": 1462742886
          }, {
              "WindStrength": 10,
              "WindAngle": 315,
              "time_utc": 1462743136
          }
          ],
          "date_max_wind_str": 1462742283,
          "date_max_temp": 1462687491,
          "date_min_temp": 1462687491,
          "min_temp": 0,
          "max_temp": 0,
          "max_wind_angle": 44,
          "max_wind_str": 20
      },
      "data_type": ["Wind"],
      "battery_vp": 5613,
      "battery_percent": 79,
      "rf_status": 79,
      "_id": "",
      "last_message": 1462745975,
      "last_seen": 1462745949,
      "last_setup": 1448382569,
      "module_name": "Wind",
      "firmware": 43
    });
    device.modules.push({
      "_id": "",
      "last_message": 1462745975,
      "last_seen": 1462745949,
      "last_setup": 1448382569,
      "module_name": "Rain",
      "firmware": 43,
      "battery_vp": 5613,
      "battery_percent": 79,
      "rf_status": 79,
      "type": "NAModule3",
      "dashboard_data": {
          "time_utc": 1462745962,
          "Rain": 20,
          "sum_rain_24": 40,
          "sum_rain_1": 5
      },
      "data_type": ["Rain"]
    });


    // render modules
    this.dom = this.getDesign(this.config.design).render(device);
    //this.dom = this.renderModules(device);
    this.updateDom(this.config.animationSpeed);
    return Q({});
    /* eslint-enable new-cap */
  },
  renderModules: function(device) {
    var sResult = $('<div/>').addClass('modules');
    var aOrderedModuleList = this.config.moduleOrder && this.config.moduleOrder.length > 0 ?
      this.config.moduleOrder :
      null;

    if (aOrderedModuleList) {
      for (var moduleName of aOrderedModuleList) {
        if (device.module_name === moduleName) {
          sResult.append(this.renderModule(device));
        } else {
          for (var module of device.modules) {
            if (module.module_name === moduleName) {
              sResult.append(this.renderModule(module));
              break;
            }
          }
        }
      }
    } else {
      // render station data (main station)
      sResult.append(this.renderModule(device));
      // render module data (connected modules)
      for (var cnt = 0; cnt < device.modules.length; cnt++) {
        sResult.append(this.renderModule(device.modules[cnt]));
      }
    }
    return sResult;
  },
  renderModule: function(oModule) {
    return $('<div/>').addClass('module').append(
      $('<div>').addClass('data').append(this.renderSensorData(oModule))
    ).append(
      $('<div>').addClass('name small').append(oModule.module_name)
    );
  },
  renderSensorData: function(oModule) {
    var sResult = $('<table/>');
    var aDataTypeList = this.config.dataOrder && this.config.dataOrder.length > 0 ?
      this.config.dataOrder :
      oModule.data_type;
    for (var dataType of aDataTypeList) {
      if ($.inArray(dataType, oModule.data_type) > -1) {
        sResult.append(
          this.renderData(
            this.formatter.clazz(dataType),
            dataType,
            oModule.dashboard_data[dataType])
        );
      }
    }
    return sResult;
  },
  renderData: function(clazz, dataType, value) {
    return $('<tr/>').append(
      $('<td/>').addClass('small').append(
        this.translate(dataType.toUpperCase())
      )
    ).append(
      $('<td/>').addClass('small value').append(
        this.formatter.value(dataType, value)
      )
    );
  },
  renderError: function(reason) {
    console.log("error " + reason);
    //  enable display of error messages
    /*
    $(netatmo.location).updateWithText(
      "could not load data: "+reason.responseJSON.error,
      this.config.fadeInterval
    );
    */
  },
  formatter: {
    value: function(dataType, value) {
      switch (dataType) {
        case 'CO2':
          return value.toFixed(0) + ' ppm';
        case 'Noise':
          return value.toFixed(0) + ' dB';
        case 'Humidity':
          return value.toFixed(0) + '%';
        case 'Pressure':
          return value.toFixed(0) + ' mbar';
        case 'Temperature':
          return value.toFixed(1) + '°';
        case 'Rain':
          return value.toFixed(1) + 'mm';
        case 'Wind':
        case 'WindStrength':
          return value.toFixed(0);
        case 'WindAngle':
          return this.direction(value) + ' | ' + value + '°';
        case 'Battery':
          return value.toFixed(0) + '%';
        default:
          return value;
      }
    },
    direction: function(value){
      if(value < 11.25)return 'N';
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
    rain: function(value){
      return '';
    },
    clazz: function(dataType) {
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
      }
    }
  },
  getDesign: function(design){
    var that = this;
    var formatter = this.formatter;
    var translator = this.translate;
    return {
      classic: function(formatter){
        return {

        };
      }(formatter),
      bubbles: function(formatter, translator, that){
        return {
          moduleType: {
            MAIN: "NAMain",
            INDOOR: "NAModule4",
            OUTDOOR: "NAModule1",
            RAIN: "NAModule3",
            WIND: "NAModule2"
          },
          render: function(device){
            var sResult = $('<div/>').addClass('modules');
            var aOrderedModuleList = that.config.moduleOrder && that.config.moduleOrder.length > 0 ?
              that.config.moduleOrder :
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
          module: function(module){
            var type = module.type;
            var result = $('<div/>').addClass('module').append(
              $('<div/>').addClass('name small').append(module.module_name)
            ).append(
              $('<div/>').append(
                $('<table/>').addClass('').append(
                  $('<tr/>').append(
                    this.primary(module)
                  ).append(
                    this.secondary(module)
                  ).append(
                    this.data(module)
                  )))
            );
            return result[0].outerHTML;
          },
          primary: function(module){
            var result = $('<td/>').addClass('primary');
            switch(module.type){
              case this.moduleType.MAIN:
              case this.moduleType.INDOOR:
              case this.moduleType.OUTDOOR:
                var type = 'Temperature';
                var value = module.dashboard_data[type];
                $('<div/>').addClass(type).append(
                  $('<div/>').addClass('large light bright').append(formatter.value(type, value))
                ).appendTo(result);
                break;
              case this.moduleType.WIND:
                var type = 'WindStrength';
                var value = module.dashboard_data[type];
                $('<div/>').addClass(type).append(
                  $('<div/>').addClass('large light bright').append(formatter.value(type, value))
                ).append(
                  $('<div/>').addClass('xsmall').append('m/s')
                ).appendTo(result);
                break;
              case this.moduleType.RAIN:
                var type = 'Rain';
                var value = module.dashboard_data[type];
                $('<div/>').addClass(type).append(
                  $('<div/>').addClass('large light bright').append(formatter.value(type, value))
                ).append(
                  $('<div/>').addClass('xsmall').append('mm/h')
                ).appendTo(result);
                break;
              default:
            }
            return result;
          },
          secondary: function(module){
            var result = $('<td/>').addClass('secondary');
            switch(module.type){
              case this.moduleType.MAIN:
              case this.moduleType.INDOOR:
                var type = 'CO2';
                var value = module.dashboard_data[type];
                var status = value > 1600?'bad':value > 800?'average':'good';

                $('<div/>').addClass(type).append(
                  $('<div/>').addClass('visual').addClass(status)
                ).append(
                  $('<div/>').addClass('small value').append(formatter.value(type, value))
                ).appendTo(result);
                break;
              case this.moduleType.OUTDOOR:
                break;
              case this.moduleType.WIND:
                var type = 'WindAngle';
                var value = module.dashboard_data[type];

                $('<div/>').addClass(type).append(
                  $('<div/>').addClass('visual xlarge wi wi-wind-direction').css('transform', 'rotate(' + value + 'deg)')
                ).append(
                  $('<div/>').addClass('small value').append(formatter.value(type, value))
                ).appendTo(result);
                break;
              case this.moduleType.RAIN:
                break;
              default:
                break;
            }
            return result;
          },
          data: function(module){
            var result = $('<td/>').addClass('data');
            switch(module.type){
              case this.moduleType.MAIN:
                this.addHumidity(result, module);
                //this.addTemperatureTrend(result, module);
                this.addPressure(result, module);
                //this.addPressureTrend(result, module);
                this.addNoise(result, module);
                //result += this.addData('max_temp', module.dashboard_data['max_temp']);
                //result += this.addData('min_temp', module.dashboard_data['min_temp']);
                //result += $('<div/>').addClass('small').append('WiFi: ' + module.wifi_status)[0].outerHTML;
                break;
              case this.moduleType.INDOOR:
                this.addHumidity(result, module);
                //this.addTemperatureTrend(result, module);
                this.addBattery(result, module);
                //result += $('<div/>').addClass('small').append('Radio: ' + module.rf_status)[0].outerHTML;
                break;
              case this.moduleType.OUTDOOR:
                this.addHumidity(result, module);
                //this.addTemperatureTrend(result, module);
                this.addBattery(result, module);
                break;
              default:
                break;
            }
            return result;
          },
          addTemperatureTrend: function(parent, module){
            this.addData(parent, 'temp_trend',
              translator.bind(that)(module.dashboard_data['temp_trend'].toUpperCase()));
          },
          addPressure: function(parent, module){
            return this.addData(parent, 'Pressure', module.dashboard_data['Pressure']);
          },
          addPressureTrend: function(parent, module){
            this.addData(parent, 'pressure_trend',
              translator.bind(that)(module.dashboard_data['pressure_trend'].toUpperCase()));
          },
          addHumidity: function(parent, module){
            return this.addData(parent, 'Humidity', module.dashboard_data['Humidity']);
          },
          addNoise: function(parent, module){
            return this.addData(parent, 'Noise', module.dashboard_data['Noise']);
          },
          addBattery: function(parent, module){
            return this.addData(parent, 'Battery', module.battery_percent);
          },
          addData: function(parent, type, value){
            return $('<div/>')
              .addClass('small')
              .append(
                translator.bind(that)(type.toUpperCase())
                + ': '
                + formatter.value(type, value)
              )
              .appendTo(parent);
          }
        };
      }(formatter, translator, that)
    }[design]
  },
  getScripts: function() {
    return [
      'String.format.js',
      '//cdnjs.cloudflare.com/ajax/libs/jquery/2.2.2/jquery.js',
      'q.min.js',
      'moment.js'
    ];
  },
  getStyles: function() {
    return [
      'netatmo.css'
    ];
  },
  getTranslations: function() {
    return {
      en: 'l10n/en.json',
      de: 'l10n/de.json',
      fr: 'l10n/fr.json'
    };
  },
  getDom: function() {
    var dom = $('<div/>').addClass('netatmo').addClass(this.config.design);
    if(this.dom){
      dom.append(
        this.dom
      ).append(
        $('<div/>')
          .addClass('updated xsmall')
          .append(moment(new Date(1000 * this.lastUpdate)).fromNow())
      );
      if(!this.config.hideLoadTimer){
        dom.append($(
          '<svg class="loadTimer" viewbox="0 0 250 250">' +
          '  <path class="border" transform="translate(125, 125)"/>' +
          '  <path class="loader" transform="translate(125, 125) scale(.84)"/>' +
          '</svg>'
        ));
      }
    }else{
      dom.append($(
        '<svg class="loading" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">' +
        '  <circle class="outer"></circle>' +
        '  <circle class="inner">' +
        '    <animate attributeName="stroke-dashoffset" dur="5s" repeatCount="indefinite" from="0" to="502"></animate>' +
        '    <animate attributeName="stroke-dasharray" dur="5s" repeatCount="indefinite" values="150.6 100.4;1 250;150.6 100.4"></animate>' +
        '  </circle>' +
        '</svg>'
      ));
    }
    return dom[0];
  }
});
