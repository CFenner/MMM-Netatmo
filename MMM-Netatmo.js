/* Magic Mirror
 * Module: Netatmo
 *
 * By Christopher Fenner http://github.com/CFenner
 * MIT Licensed.
 */
 /* global $, Q, moment, Module, Log */
 
// Mmanage the PIR and the module.hidden at the same time
var UserPresence = true; // by default we are present (no PIR sensor to cut)
var ModuleNetatmoHidden = false; /// by default  display the module (if no carousel module or other)

var lastUpdateServeurNetatmo = 0; // Used to memorize the timestamp given by netatmo on the date of his info. New info every 10 min
var DateUpdateDataAirQuality = 0; // The last date we updated the info Air Quality min

var AirQualityImpact = 'Wait..'; 
var AirQualityValue = 0; //Initial air quality

 
Module.register('MMM-Netatmo', {
  // default config,
  defaults: {
  
  //for AirQuality
  lang: 'de',
	location: 'germany/berlin',
	updateIntervalAirQuality: 600, // en secondes = every 30 minutes

    
    refreshToken: null,
    updatesIntervalDisplay: 60, 
    animationSpeed: 1000,
	updatesIntervalDisplayID: 0,
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
    Log.info('Starting module: ' + this.name);//First time at the launch of the mirror
 		
	  // run upload for the first time, everyone will remember their upload date
    this.updateLoad();
    this.loadAirQuality();
    // is useless because called by resume and values ​​of dates have no time to memorize before ...
    // if it serves, because resume is not always called at startup ...
		
	  // set a timer to manage uploads and displays whether or not there is a presence
	  this.config.updatesIntervalDisplayID = setInterval(() => { 
		this.GestionUpdateIntervalNetatmo(); }, this.config.updatesIntervalDisplay*1000);
					
    //	Log.log("End function start, updatesIntervalDisplayID : " + this.config.updatesIntervalDisplayID);			

  },
  
	suspend: function() { // core called when the module is hidden
		ModuleNetatmoHidden = true; //module hidden
		Log.log("Suspend - Module Netatmo hidden");
		this.GestionUpdateIntervalNetatmo(); //when called the function that handles all cases
	},
	
	resume: function() { // core called when the module is displayed
		ModuleNetatmoHidden = false;
		Log.log("Resume - Module Netatmo display");
		this.GestionUpdateIntervalNetatmo();	
	},

	notificationReceived: function(notification, payload) {
		if (notification === "USER_PRESENCE") { // notification sent by the MMM-PIR-Sensor module. See his doc
			Log.log("NotificationReceived USER_PRESENCE = " + payload);
			UserPresence = payload;
			this.GestionUpdateIntervalNetatmo();
		}
	},
	
	GestionUpdateIntervalNetatmo: function() {
		
		Log.log("GestionUpdateIntervalNetatmo - Netatmo data: "
				+ moment.unix(lastUpdateServeurNetatmo).format('dd - HH:mm:ss') + 
				" - AirQuality data : "+ moment.unix(DateUpdateDataAirQuality).format('dd - HH:mm:ss') +
				" - and we are : " + moment.unix(Date.now() / 1000).format('dd - HH:mm:ss'));

	    // make sure to have a user present in front of the screen (sensor PIR) and that the module is well displayed
		  if (UserPresence === true && ModuleNetatmoHidden === false){ 
		
			Log.log("Netatmo is displayed and user present! We need to update if necessary");

			if(Date.now() / 1000 - DateUpdateDataAirQuality > this.config.updateIntervalAirQuality){
				Log.log("Data AirQuality have more than "+ this.config.updateIntervalAirQuality + " s, update requested");
				this.loadAirQuality();
			}else{
				var calcul = Date.now() / 1000 - DateUpdateDataAirQuality;
				Log.log("Data AirQuality ont :" + calcul + 
				"it's less "+ this.config.updateIntervalAirQuality + " s, we do not update");
				
			}
				            
			if(Date.now() / 1000 - lastUpdateServeurNetatmo > 660){// we are more than 11min after the last datas of the server -> it is necessary to update
		
				Log.log("Data Netatmo have more than 11 min, update requested");
				this.updateLoad();
			}else{
				Log.log("Data Netatmo are less than 11 min, no update");
			}

			//Reset the update interval, if not already active (to avoid multiple instances)
			if (this.config.updatesIntervalDisplayID === 0){		
						
				this.config.updatesIntervalDisplayID = setInterval(() => {
					 this.GestionUpdateIntervalNetatmo(); }, this.config.updatesIntervalDisplay*1000);
						
			Log.log("Netatmo timer in place, updatesIntervalDisplayID : " + this.config.updatesIntervalDisplayID);

			}
			
		}else{ //sinon (UserPresence = false OU ModuleHidden = true)
			
			clearInterval(this.config.updatesIntervalDisplayID); // stop the current update interval
			this.config.updatesIntervalDisplayID=0; // we reset the variable
		}
	},
	
	  
	//Air Quality
	loadAirQuality: function(){

	//	Log.log("Fct loadAirQuality - OK DATA LOAD.");		
		_aqiFeed({
			lang: this.config.lang,
			city: this.config.location,
			callback: this.renderAirQuality.bind(this) // error log here when fct called 2 times too close. Not impact
		});
	},
	
	renderAirQuality: function(data){
			
		AirQualityValue = $(data.aqit).find("span").text();
		AirQualityImpact = data.impact;	
		
		//We memorize the date of our data upload
		DateUpdateDataAirQuality = Date.now() / 1000;
		
		//Log.log("renderAirQuality at "+ moment.unix(DateUpdateDataAirQuality).format('dd - HH:mm:ss') +" - value : " + AirQualityValue + ' - impact : '+ AirQualityImpact);

	},

	//fin airquality
  
  updateLoad: function() {
    Log.log("Netatmo : updateLoad"); //Every 10 min (update interval), step 1 of the update

    var that = this;
    return Q.fcall(
      this.load.token.bind(that),
      this.renderError.bind(that)
    ).then(
      this.load.data.bind(that),
      this.renderError.bind(that)
    ).then(
      this.renderAll.bind(that)
      );
  },
  
    
  load: {
    token: function() {
			
       //Log.log("Netatmo : load - token");
      return Q($.ajax({
        type: 'POST',
        url: this.config.api.base + this.config.api.authEndpoint,
        data: this.config.api.authPayload.format(
            this.config.refreshToken,
            this.config.clientId,
            this.config.clientSecret)
      }));
    },
    
    data: function(data) {
				
      // Log.log("Netatmo : load - data");
      //Log.info(this.name + " token loaded "+data.access_token);
      this.config.refreshToken = data.refresh_token;
      // call for station data
      return Q($.ajax({
        url: this.config.api.base + this.config.api.dataEndpoint,
        data: this.config.api.dataPayload.format(data.access_token)
      }));
      
    }
  },
  
  renderAll: function(data) {

    // Log.log("Netatmo : renderAll");
    // Log.info(this.name + " data loaded, updated "+moment(new Date(1000*device.dashboard_data.time_utc)).fromNow());
    var device = data.body.devices[0];
    this.lastUpdate = device.dashboard_data.time_utc;
   	lastUpdateServeurNetatmo = device.dashboard_data.time_utc;
    // render modules
    this.dom = this.getDesign('bubbles').render(device); 
    this.updateDom(this.config.animationSpeed);
    return Q({});
  },
  
  renderError: function(reason) {
    console.log("error " + reason);
  },
  formatter: {
    value: function(dataType, value) {
	  
    	//  Log.log("Netatmo : formatter - value");

      if(!value)
        return value;
      switch (dataType) {
        case 'CO2':
          return value.toFixed(0) + ' ppm';
        case 'Noise':
          return value.toFixed(0) + ' dB';
        case 'Humidity':
          return value.toFixed(0) + '%';
        case 'Rain':
          if (value > 0) return value.toFixed(0) + ' cm/Std';
          return 'NA';
        case 'Wind':
        case 'WindStrength':
          if (value > 0) return value.toFixed(0) + ' km/Std';
          return 'NA';
        case 'WindAngle':
          if (value < 0) return " ";
          var tailval = ' | ' + value + '°';
          if(value < 11.25)return 'N' + tailval;
          if(value < 33.75) return 'NNE'+ tailval;
          if(value < 56.25) return 'NE'+ tailval;
          if(value < 78.75) return 'ENE'+ tailval;
          if(value < 101.25) return 'E'+ tailval;
          if(value < 123.75) return 'ESE'+ tailval;
          if(value < 146.25) return 'SE'+ tailval;
          if(value < 168.75) return 'SSE'+ tailval;
          if(value < 191.25) return 'S'+ tailval;
          if(value < 213.75) return 'SSW'+ tailval;
          if(value < 236.25) return 'SW'+ tailval;
          if(value < 258.75) return 'WSW'+ tailval;
          if(value < 281.25) return 'W'+ tailval;
          if(value < 303.75) return 'WNW'+ tailval;
          if(value < 326.25) return 'NW'+ tailval;
          if(value < 348.75) return 'NNW'+ tailval;
          return 'N'+ tailval;
        case 'Battery':
          return value.toFixed(0) + '%';
        case 'WiFi':
        case 'Radio':
          return value.toFixed(0) + '%';
        case 'Pressure':
          return value.toFixed(0) + ' mBar';
        case 'Temperature':
          return value.toFixed(1) + '°C';
        case 'min_temp':
        case 'max_temp':
          return value.toFixed(1) + '°C';
        default:
          return value;
      }
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
  },
  
  getDesign: function(design){
	      
    //	Log.log("Netatmo : getDesign");
    
    var that = this;
    var formatter = this.formatter;
    var translator = this.translate;
    var WindValue = -1; 
    var WindAngleValue = -1;
    var RainValue = -1;
  

    return {
      bubbles: (function(formatter, translator, that){ 
        return {
          moduleType: {
            MAIN: "NAMain",
            INDOOR: "NAModule4",
            OUTDOOR: "NAModule1",
            RAIN: "NAModule3",
            WIND: "NAModule2"
          },
          render: function(device){
            var sResult = $('<div/>').addClass('modules').addClass('bubbles');
            var aOrderedModuleList = that.config.moduleOrder && that.config.moduleOrder.length > 0 ?
              that.config.moduleOrder :
              null;

            if (aOrderedModuleList) {
              for (var moduleName of aOrderedModuleList) {
                if (device.module_name === moduleName) {
                  sResult.append(this.module(device));
                } else {
                  for (var module of device.modules) 
                  {
                    //Log.log(module.module_name);
                    //Log.log(module.type);
                    if (module.module_name === moduleName)
                    {
                      switch(module.type)
                      {
                        case this.moduleType.MAIN:
                        case this.moduleType.INDOOR:
                        case this.moduleType.OUTDOOR:
                          sResult.append(this.module(module));
                        break;
      
                        case this.moduleType.WIND:
                          if (module.dashboard_data === undefined) {
                            break;
                          }
                          WindValue = module.dashboard_data['WindStrength'];
                          WindAngleValue = module.dashboard_data['WindAngle'];
                          
                        break;
                  
                        case this.moduleType.RAIN:
                          if (module.dashboard_data === undefined) {
                              break;
                          }
                          RainValue = module.dashboard_data['Rain'];
                          
                        break; 
                      } 

                      break;
                    }
                  }
                }
              }
            } else {
              // render station data (main station)
              sResult.append(this.module(device));
              // render module data (connected modules)
              for (var cnt = 0; cnt < device.modules.length; cnt++) 
              {
                switch(device.modules[cnt].type)
                {
                  case this.moduleType.MAIN:
                  case this.moduleType.INDOOR:
                  case this.moduleType.OUTDOOR:
                    sResult.append(this.module(device.modules[cnt]));
                  break;

                  case this.moduleType.WIND:
                    if (device.modules[cnt].dashboard_data === undefined) {
                      break;
                    }
                   WindValue = device.modules[cnt].dashboard_data['WindStrength'];
                   WindAngleValue = device.modules[cnt].dashboard_data['WindAngle'];
                    
                  break;
            
                  case this.moduleType.RAIN:
                    if (device.modules[cnt].dashboard_data === undefined) {
                        break;
                     }
                    RainValue = device.modules[cnt].dashboard_data['Rain'];
                  break; 
                }  
              }
            }
            return sResult;
          },
          
          //Defined the overall structure of the display of each element of the module (indoor, outdoor). The last line being in the getDom
          module: function(module){
            var type;
            var value;
            var result = $('<div/>').addClass('module').append(
                    $('<div/>').addClass('name small').append(module.module_name)
                  ).append(
                    $('<div/>').append(
                      $('<table/>').append(
                        $('<tr/>').append(
                          this.displayTemp(module)
                        ).append(
                          this.displayExtra(module)
                        )//finsh tr
                      )//finsh table
                    )//finsh div
                  ).append(
                    $('<div/>').addClass('align-left').append(this.displayInfos(module))
                  ).append(
                    $('<div/>').addClass('line')
                  );
              return result[0].outerHTML;
          },
          
          displayTemp: function(module){
            var result = $('<td/>').addClass('displayTemp');
            var type;
            var value;
            switch(module.type){
              case this.moduleType.MAIN:
              case this.moduleType.OUTDOOR:
                type = 'Temperature';
                if (module.dashboard_data === undefined) {
                  value = "NA";
                  valueMin = "NA";
                  valueMax = "NA";
                  valueTrend = "";
                }
                else
                {
                 value = module.dashboard_data[type];
                 valueMin = module.dashboard_data['min_temp'];
                 valueMax = module.dashboard_data['max_temp'];
                 valueTrend = module.dashboard_data['temp_trend'];
                }
                
                // Log.log("getDesign - Temperature : " + value + ' C');

                if (valueTrend == 'up'){
                  TrendIcon = 'fa fa-arrow-up';
                }else if (valueTrend == 'stable'){
                  TrendIcon = 'fa fa-arrow-right';
                }else if (valueTrend == 'down'){
                  TrendIcon = 'fa fa-arrow-down';
                }else{
                  TrendIcon = 'fa fa-question';
                }
                
                $('<div/>').addClass(type).append(                 
                  $('<div/>').addClass('large light bright').append(formatter.value(type, value))
                ).append(                  
                  $('<span/>').addClass('updated xsmall').addClass(TrendIcon)
                ).append(
                  $('<span/>').addClass('small light').append(' ' + formatter.value(type, valueMin) + ' - ' + formatter.value(type, valueMax))
                )
                .appendTo(result);
              break;
              case this.moduleType.INDOOR:
                  type = 'Temperature';
                  if (module.dashboard_data === undefined)
                    value = "NA";
                  else
                    value = module.dashboard_data[type];
                    
                  $('<div/>').addClass(type).append(                 
                    $('<div/>').addClass('x-medium light bright').append(formatter.value(type, value))
                  ).appendTo(result);
                  
                
              break; 
              default:
            }
            return result;
          },

          displayHum: function(module){
            var result;
            var value = "";
            var type = 'Humidity'; 
            switch(module.type){
              case this.moduleType.MAIN:             
             
              result = $('<div/>').addClass('displayHum');
              if (module.dashboard_data === undefined)
                value = "NA";
              else
                value = module.dashboard_data[type];			
				
				      if (value >= 40 && value <= 60){
					      status = '';
				      }else if (value < 40 && value > 30 || value < 70 && value > 60){
					      status = 'textorange';
				      }else if (value <= 30 || value >= 70){
				      	status = 'textred';
              }
              
              $('<div/>').addClass(type)
              .append(
              $('<div/>').addClass('fa fa-tint').addClass(status)
              ).append(
              $('<span/>').addClass('small value').append('  Humidity: '+ formatter.value(type, value))
              ).appendTo(result);
              
              break;
              case this.moduleType.OUTDOOR:
              case this.moduleType.INDOOR:
              default:
                break;
            }
            return result;
          },

          displayExtra: function(module){
            var result = $('<td/>').addClass('displayExtra');
            var valueCO2 = 0;
            switch(module.type){
              case this.moduleType.MAIN:
                if (module.dashboard_data === undefined)
                  valueCO2 = 1000;
                else
                  valueCO2 = module.dashboard_data['CO2'];      
                var statusCO2 = valueCO2 > 2000?'bad':valueCO2 > 1000?'average':'good';

                $('<div/>').addClass('').append(
                  $('<div/>').addClass('small value').append('CO² : ' + formatter.value('CO2', valueCO2))
                ).append(
                  $('<div/>').addClass('visual small').addClass(statusCO2)
                ).append(
                  this.displayHum(module)     
                ).appendTo(result);   
              break;
                    
              case this.moduleType.INDOOR:
                var valueCO2 = 0;
                if (module.dashboard_data === undefined)
                  valueCO2 = 1000;
                else
                  valueCO2 = module.dashboard_data['CO2'];     
                var statusCO2 = valueCO2 > 2000?'bad':valueCO2 > 1000?'average':'good';

                $('<div/>').addClass('').append(
                  $('<div/>').addClass('small value').append('CO² : ' + formatter.value('CO2', valueCO2))
                ).append(
                  $('<div/>').addClass('visual-s small').addClass(statusCO2)  
                ).appendTo(result);                  
                
              break;
            
              case this.moduleType.OUTDOOR:
              // Display the AirQuality base on Air Quality and Pollution Measurement. 
              var statusAirQuality = isNaN(AirQualityValue)?'textgray'
              :AirQualityValue < 51?'textgreen'
              :AirQualityValue < 101?'textyellow'
              :AirQualityValue < 151?'textorange'
              :AirQualityValue < 201?'textred'
              :AirQualityValue < 301?'textpurple'
              :'textdeepred';
          
              $('<div/>').addClass('').append(
					    $('<div/>').addClass('medium light').append(AirQualityImpact)
              ).append(
					    $('<span/>').addClass('fa fa-leaf').addClass(statusAirQuality)
				      ).append(
					    $('<span/>').addClass('small value').append(' AQI: ' + AirQualityValue)
    
             ).appendTo(result);
                            
              default:
                break;
            }
            return result;
          },
          
          displayInfos: function(module){ //add additional information module at the bottom
            var result = $('<td/>').addClass('');
            var valuePressure = 0;
            var valueNoise = 0;
            switch(module.type){
              case this.moduleType.MAIN: //the main interior module

                var valueWiFi = module.wifi_status;
                if (module.dashboard_data === undefined)
                {
                  valuePressure = 0;
                  valueNoise = 0;
                }
                else
                {
                  valuePressure = module.dashboard_data['Pressure'];
                  valueNoise = module.dashboard_data['Noise'];
                }
				        var statusWiFi = valueWiFi < 40?'textred':'';
                    
                //70dB vacuum cleaner. 40dB: library 
				        var statusNoise = valueNoise > 70?'fa fa-volume-up':valueNoise > 50?'fa fa-volume-down':'fa fa-volume-off';
                var statusNoiseQuality =  valueNoise > 70?'textred':valueNoise > 50?'textorange':'';

				        // print information
				        $('<td/>').addClass('').append(
                  $('<span/>').addClass('fa fa-wifi').addClass(statusWiFi)
                ).append(
                  $('<span/>').addClass('updated xsmall').append(' WiFi: ' + formatter.value('WiFi', valueWiFi) + '  ')
                ).append(
                  $('<span/>').addClass('fa fa-thermometer-half')
                ).append( 
                  $('<span/>').addClass('updated xsmall').append(' Pressure: ' + formatter.value('Pressure', valuePressure ) + ' ')
                ).append(
                  $('<span/>').addClass(statusNoise).addClass(statusNoiseQuality)
                ).append(
                  $('<span/>').addClass('updated xsmall').append(' Noise: ' + formatter.value('Noise', valueNoise))
                ).append(
                    $('<div/>').addClass('line')
                ) .appendTo(result);   
                    
              break;

              case this.moduleType.INDOOR:  
                                          
                var valueBattery = module.battery_percent;
                var valueRadio = module.rf_status;
                var valueHum = 0;
       
                // Set battery and radio status color
                var statusBattery = valueBattery < 30?'textred fa fa-battery-1 fa-fw':valueBattery < 70?'fa fa-battery-2 fa-fw':'fa fa-battery-4 fa-fw';
                var statusRadio = valueRadio < 30?'textred':'';
                if (module.dashboard_data === undefined)
                  valueHum = 0;
                else
                  valueHum = module.dashboard_data['Humidity'];

                var statusHum;
                // Set humidity status color
                if (valueHum >= 40 && valueHum <= 60){
                  statusHum = '';
                  }else if (valueHum < 40 && valueHum > 30 || valueHum < 70 && valueHum > 60){
                  statusHum = 'textorange';
                  }else if (valueHum <= 30 || valueHum >= 70){
                  statusHum = 'textred';
                }

                // print information
                $('<td/>').addClass('').append(
                  $('<span/>').addClass(statusBattery)
                ).append(
                  $('<span/>').addClass('updated xsmall').append(formatter.value('Battery', valueBattery) + ' ')
                ).append(
                  $('<span/>').addClass('fa fa-signal fa-fw').addClass(statusRadio)
                ).append(
                  $('<span/>').addClass('updated xsmall').append(' Radio: ' + formatter.value('Radio', valueRadio) + ' ')
                ).append(
                  $('<span/>').addClass('fa fa-tint').addClass(statusHum)
                ).append(
                  $('<span/>').addClass('updated xsmall').append(' Humidity: ' + formatter.value('Humidity', valueHum))
                ).append(
                  $('<div/>').addClass('line')
                ).appendTo(result);                                     
                
              break;
                
              case this.moduleType.OUTDOOR: 
                                          
                var valueBattery = module.battery_percent;
                var valueRadio = module.rf_status;
                var valueHum = 0;
                // Set battery and radio status color
                var statusBattery = valueBattery < 30?'textred fa fa-battery-1 fa-fw':valueBattery < 70?'fa fa-battery-2 fa-fw':'fa fa-battery-4 fa-fw';
                var statusRadio = valueRadio < 30?'textred':'';

                 // Set humidity status color
                 if (module.dashboard_data === undefined)
                  valueHum = 0;
                else
                  valueHum = module.dashboard_data['Humidity'];

                var statusHum;

                if (valueHum >= 40 && valueHum <= 60){
                  statusHum = '';
                  }else if (valueHum < 40 && valueHum > 30 || valueHum < 70 && valueHum > 60){
                  statusHum = 'textorange';
                  }else if (valueHum <= 30 || valueHum >= 70){
                  statusHum = 'textred';
                }

                // print information
                $('<div/>').addClass('').append(
                  $('<span/>').addClass(statusBattery)
                ).append(
                  $('<span/>').addClass('updated xsmall').append(formatter.value('Battery', valueBattery) + ' ')
                ).append(
                  $('<span/>').addClass('fa fa-signal fa-fw').addClass(statusRadio)
                ).append(
                  $('<span/>').addClass('updated xsmall').append(' Radio: ' + formatter.value('Radio', valueRadio) + ' ')
                ).append(
                   $('<span/>').addClass('fa fa-tint').addClass(statusHum)
                ).append(
                  $('<span/>').addClass('updated xsmall').append(' Humidity: ' + formatter.value('Humidity', valueHum))
                ).append(
                  $('<div/>').append(
                    $('<table/>').append(
                      $('<tr/>')
                        .append(
                          $('<span/>').addClass('wi wi-rain')
                        ).append(
                          $('<span/>').addClass('updated xsmall').append('Rain: ' + formatter.value('Rain',RainValue ) + ' ')
                        ).append(
                          $('<span/>').addClass('wi wi-strong-wind')
                        ).append(
                          $('<span/>').addClass('updated xsmall').append('Wind: ' + formatter.value('Wind',WindValue ) + ' ')
                        ).append(
                           $('<span/>').addClass('updated xsmall').append(formatter.value('WindAngle', WindAngleValue))
                      )//finsh tr
                    )//finsh table
                  )//finsh div
                ).append(
                  $('<div/>').addClass('line')  
                )
                .appendTo(result);                                     
              break;

              default:
                break;
            }
            return result;
          },
        };
      })(formatter, translator, that) // end of the bubbles design
    }[design]
  },

  getScripts: function() {
//	      Log.log("Netatmo : getScripts");
    return [
      'aqiFeed.js', //AirQuality
      'String.format.js',
      '//cdnjs.cloudflare.com/ajax/libs/jquery/2.2.2/jquery.js',
      'q.min.js',
      'moment.js'
    ];
  },
  getStyles: function() {
	    // Log.log("Netatmo : getStyles");
      return ['netatmo.css', 'font-awesome.css', 'weather-icons.css'];
  },
	
  getTranslations: function() {
    //Log.log("Netatmo : getTranslations");
    return {
      en: 'translations/en.json',
      de: 'translations/de.json',
      fr: 'translations/fr.json',
      cs: 'translations/cs.json',
      nb: 'translations/nb.json'
    };
  },
  
  getDom: function() {
	     
	Log.log("Netatmo : getDom");
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
