/* Magic Mirror
 * Module: Netatmo
 *
 * By Christopher Fenner http://github.com/CFenner
 * MIT Licensed.
 */
 /* eslint-disable max-len */
 /* global $, Q, moment, Module, Log */
Module.register('netatmo', {
  // default config
  defaults: {
    refreshToken: null,
    updateInterval: 3, // every 3 minutes, refresh interval on netatmo is 10 minutes
    animationSpeed: 1000,
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
    var sContent = '';
    var device = data.body.devices[0];
    this.lastUpdate = device.dashboard_data.time_utc;
    // Log.info(this.name + " data loaded, updated "+moment(new Date(1000*device.dashboard_data.time_utc)).fromNow());
    // render modules
    sContent += this.renderModules(device);
    // place content
    this.dom = sContent;
    this.updateDom(this.config.animationSpeed);
    return Q({});
    /* eslint-enable new-cap */
  },
  renderModules: function(device) {
    var sResult = '';
    var aOrderedModuleList = this.config.moduleOrder && this.config.moduleOrder.length > 0 ?
      this.config.moduleOrder :
      null;

    if (aOrderedModuleList) {
      for (var moduleName of aOrderedModuleList) {
        if (device.module_name === moduleName) {
          sResult += this.renderModule(device);
        } else {
          for (var module of device.modules) {
            if (module.module_name === moduleName) {
              sResult += this.renderModule(module);
              break;
            }
          }
        }
      }
    } else {
      // render station data (main station)
      sResult += this.renderModule(device);
      // render module data (connected modules)
      for (var cnt = 0; cnt < device.modules.length; cnt++) {
        sResult += this.renderModule(device.modules[cnt]);
      }
    }
    return this.html.moduleWrapper.format(sResult);
  },
  renderModule: function(oModule) {
    return this.html.module.format(
      this.renderSensorData(oModule),
      oModule.module_name
    );
  },
  renderSensorData: function(oModule) {
    var sResult = '';
    var aDataTypeList = this.config.dataOrder && this.config.dataOrder.length > 0 ?
      this.config.dataOrder :
      oModule.data_type;
    for (var dataType of aDataTypeList) {
      if ($.inArray(dataType, oModule.data_type) > -1) {
        sResult += this.renderData(
          this.formatter.clazz(dataType),
          dataType,
          oModule.dashboard_data[dataType]);
      }
    }
    return this.html.dataWrapper.format(sResult);
  },
  renderData: function(clazz, dataType, value) {
    return this.html.data.format(
      this.translate(dataType.toUpperCase()),
      this.formatter.value(dataType, value));
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
          return value;
        default:
          return value;
      }
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
  html: {
    moduleWrapper: '<div class="modules">{0}</div>',
    module: '<div class="module"><div class="data">{0}</div><div class="name small">{1}</div></div>',
    dataWrapper: '<table class>{0}</table>',
    data: '<tr><td class="small">{0}</td><td class="value small">{1}</td></tr>',
    loadTimer: '<svg class="loadTimer" viewbox="0 0 250 250"><path class="border" transform="translate(125, 125)"/><path class="loader" transform="translate(125, 125) scale(.84)"/></svg>',
    loader:
      '<svg class="loading" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">' +
      '  <circle class="outer"></circle>' +
      '  <circle class="inner">' +
      '    <animate attributeName="stroke-dashoffset" dur="5s" repeatCount="indefinite" from="0" to="502"></animate>' +
      '    <animate attributeName="stroke-dasharray" dur="5s" repeatCount="indefinite" values="150.6 100.4;1 250;150.6 100.4"></animate>' +
      '  </circle>' +
      '</svg>',
    update: '<div class="updated xsmall">{0}</div>'
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
    return $(
      '<div class="netatmo">' +
        (this.dom ?
          this.dom +
          this.html.update.format(moment(new Date(1000 * this.lastUpdate)).fromNow()) +
          (this.config.hideLoadTimer ? '' : this.html.loadTimer) :
          this.html.loader) +
      '</div>')[0];
  }
});
