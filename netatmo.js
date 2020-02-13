/* Magic Mirror
 * Module: Netatmo
 *
 * By Christopher Fenner http://github.com/CFenner
 * MIT Licensed.
 */
 /* global $, Q, moment, Module, Log */
 
//pour gerer le PIR et le module.hidden en meme temps
var UserPresence = true; // par défaut on est présent (pas de sensor PIR pour couper)
var ModuleNetatmoHidden = false; // par défaut on affiche le module (si pas de module carousel ou autre)

var lastUpdateServeurNetatmo = 0; //memorise le timestamp donné par netatmo sur la date de ses infos. New infos toutes les 10 min
var DateUpdateDataAirQuality = 0; //la derniere date à laquelle on a updaté les infos Air Quality

var AirQualityImpact = 'GRRR'; //à ameliorer
var AirQualityValue = 0; //idem
//Fin ajout AgP
 
Module.register('netatmo', {
  // default config,
  defaults: {
  
    //from AirQuality
    lang: 'de',
	location: 'germany/berlin',
	updateIntervalAirQuality: 600, // en secondes = every 30 minutes
	//fin AirQuality
    
    refreshToken: null,
    updatesIntervalDisplay: 60, //en sec. Delais pour aller voir si besoin d'actualiser...
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
    Log.info('Starting module: ' + this.name);//AgP - 1 fois au lancement du miroir
 		
	// run upload for the first time, chacun va memoriser sa date d'upload
    this.updateLoad();
    this.loadAirQuality();
 //sert à rien car appelé par resume et les valeurs des dates ont pas le temps de se mémoriser avant...
 //si ca sert, parce que resume est pas toujours appelé au démarrage...
		
	//defini un timer pour aller gerer les uploads et les affichages seon présence ou non	
	this.config.updatesIntervalDisplayID = setInterval(() => { 
		this.GestionUpdateIntervalNetatmo(); }, this.config.updatesIntervalDisplay*1000);
					
//	Log.log("Fin fonction start, updatesIntervalDisplayID : " + this.config.updatesIntervalDisplayID);			

  },
  
	suspend: function() { //fct core appelée quand le module est caché
		ModuleNetatmoHidden = true; //module hidden
		Log.log("Fct suspend - Module Netatmo caché");
		this.GestionUpdateIntervalNetatmo(); //on appele la fonction qui gere tous les cas
	},
	
	resume: function() { //fct core appelée quand le module est affiché
		ModuleNetatmoHidden = false;
		Log.log("Fct resume - Module Netatmo AFFICHé");
		this.GestionUpdateIntervalNetatmo();	
	},

	notificationReceived: function(notification, payload) {
		if (notification === "USER_PRESENCE") { // notification envoyée par le module MMM-PIR-Sensor. Voir sa doc
			Log.log("NotificationReceived USER_PRESENCE = " + payload);
			UserPresence = payload;
			this.GestionUpdateIntervalNetatmo();
		}
	},
	
	GestionUpdateIntervalNetatmo: function() {
		
		Log.log("Fct GestionUpdateIntervalNetatmo - Données Netatmo : "
				+ moment.unix(lastUpdateServeurNetatmo).format('dd - HH:mm:ss') + 
				" - Données AirQuality : "+ moment.unix(DateUpdateDataAirQuality).format('dd - HH:mm:ss') +
				" - et on est : " + moment.unix(Date.now() / 1000).format('dd - HH:mm:ss'));

		// on s'assure d'avoir un utilisateur présent devant l'écran (sensor PIR) et que le module soit bien affiché
		if (UserPresence === true && ModuleNetatmoHidden === false){ 
		
			Log.log("Netatmo est affiché et user present ! On regarde si besoin d'updater");

			if(Date.now() / 1000 - DateUpdateDataAirQuality > this.config.updateIntervalAirQuality){
				Log.log("Data AirQuality ont plus de "+ this.config.updateIntervalAirQuality + " s, update demandée");
				this.loadAirQuality();
			}else{
				var calcul = Date.now() / 1000 - DateUpdateDataAirQuality;
				Log.log("Data AirQuality ont :" + calcul + 
				"s, c'est moins de "+ this.config.updateIntervalAirQuality + " s, on update pas");
				
			}
				            
			if(Date.now() / 1000 - lastUpdateServeurNetatmo > 660){ // on est plus de 11min apres les dernieres datas du serveur --> il faut updated
				// update tout de suite
				Log.log("Data Netatmo ont plus de 11 min, update demandée");
				this.updateLoad();
			}else{
				Log.log("Data Netatmo ont moins de 11 min, on update pas");
			}

			//et on remet l'intervalle d'update en route, si aucun deja actif (pour éviter les instances multiples)
			if (this.config.updatesIntervalDisplayID === 0){		
						
				this.config.updatesIntervalDisplayID = setInterval(() => {
					 this.GestionUpdateIntervalNetatmo(); }, this.config.updatesIntervalDisplay*1000);
						
			Log.log("Timer netatmo en place, updatesIntervalDisplayID : " + this.config.updatesIntervalDisplayID);

			}
			
		}else{ //sinon (UserPresence = false OU ModuleHidden = true)
			Log.log("Personne regarde... on coupe le timer qui surveille...");
			clearInterval(this.config.updatesIntervalDisplayID); // on arrete l'intervalle d'update en cours
			this.config.updatesIntervalDisplayID=0; //on reset la variable
		}
	},
	
	  
	//Air Quality
	loadAirQuality: function(){

	//	Log.log("Fct loadAirQuality - OK DATA LOADées.");		
		_aqiFeed({
			lang: this.config.lang,
			city: this.config.location,
			callback: this.renderAirQuality.bind(this) //erreur log ici quand fct appellée 2 fois trop proche. Pas impact
		});
	},
	
	renderAirQuality: function(data){
			
		AirQualityValue = $(data.aqit).find("span").text();
		AirQualityImpact = data.impact;	
		
		//on memorise la date de notre upload de data
		DateUpdateDataAirQuality = Date.now() / 1000;
		
		Log.log("Fct renderAirQuality at "+ moment.unix(DateUpdateDataAirQuality).format('dd - HH:mm:ss') +" - value : " + AirQualityValue + ' - impact : '+ AirQualityImpact);

	},

	//fin airquality
  
  updateLoad: function() {
    Log.log("Netatmo : updateLoad");//AgP - Toutes les 3 min (update interval), étape 1 de l'update
    
//	this.sendNotification("SHOW_ALERT",{type:"notification",message:"Update Netatmo demandée"});

    var that = this;
    //a garder entier sinon marche pas...
    return Q.fcall(
      this.load.token.bind(that),//etape 2 --> construit la requete
      this.renderError.bind(that)
    ).then(
      this.load.data.bind(that),//etape 3 --> choppe les datas ?
      this.renderError.bind(that)
    ).then(
      this.renderAll.bind(that)//etape 4 --> on a les datas, on  mets en forme et gere l'affichage
      );
  },
  
    
  load: {
    token: function() {
			
	//Log.log("Netatmo : load - token");//AgP - Toutes les 3 min (update interval), étape 2 de l'update

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
				
//	  Log.log("Netatmo : load - data");//AgP - Toutes les 3 min (update interval), étape 3 de l'update

      //Log.info(this.name + " token loaded "+data.access_token);//
      this.config.refreshToken = data.refresh_token;
      // call for station data
      return Q($.ajax({
        url: this.config.api.base + this.config.api.dataEndpoint,
        data: this.config.api.dataPayload.format(data.access_token)
      }));
      
    }
  },
  
  renderAll: function(data) {
	      
//	Log.log("Netatmo : renderAll");//AgP - Toutes les 3 min (update interval), étape 4 de l'update
    
    var device = data.body.devices[0];
    this.lastUpdate = device.dashboard_data.time_utc;
	lastUpdateServeurNetatmo = device.dashboard_data.time_utc;
    // render modules
    this.dom = this.getDesign('bubbles').render(device); //--> appel de getDesign (étape 5)
    this.updateDom(this.config.animationSpeed);
    return Q({});
  },
  
  renderError: function(reason) {
    console.log("error " + reason);
  },
  formatter: {
    value: function(dataType, value) {
	  
	//  Log.log("Netatmo : formatter - value");
	  //AgP - 13 fois toutes les 3 min (update interval), étape 6 de l'update. Appellée plusieurs fois par getDesign

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
        case 'min_temp':
        case 'max_temp':
          return value.toFixed(1) + '°';
        default:
          return value;
      }
    }
  },
  getDesign: function(design){
	      
//	Log.log("Netatmo : getDesign");//AgP - Toutes les 3 min (update interval), étape 5 de l'update
    
    var that = this;
    var formatter = this.formatter;
    var translator = this.translate;
    return {
      bubbles: (function(formatter, translator, that){ //la fonction formatter est passée en argument... appelée ci-dessous plusieurs fois
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
          
          //defini la structure globale de l'affichage de chaque element du du module (indoor, outdoor). La derniere ligne etant dans le getDom
          module: function(module){
            var result = $('<div/>').addClass('module').append(
              $('<div/>').addClass('name small').append(module.module_name)
            ).append(
              $('<div/>').append(
                $('<table/>').append(
                  $('<tr/>').append(
                    this.displayTemp(module)
                  ).append(
                    this.displayHum(module)
                  ).append(
                    this.displayExtra(module)
                  )//fin tr
                )//fin table
              )//fin div
            ).append(
              $('<div/>').addClass('align-left').append(this.displayInfos(module))
            ).append(
              $('<div/>').addClass('line')
            )
            ;
                        
            return result[0].outerHTML;
          },
          
          displayTemp: function(module){
            var result = $('<td/>').addClass('displayTemp');
            var type;
            var value;
            switch(module.type){
              case this.moduleType.MAIN:
              case this.moduleType.INDOOR:
              case this.moduleType.OUTDOOR:
                type = 'Temperature';
                value = module.dashboard_data[type];
                valueMin = module.dashboard_data['min_temp'];
                valueMax = module.dashboard_data['max_temp'];
                valueTrend = module.dashboard_data['temp_trend'];
                
                Log.log("Fct getDesign - Temperature : " + value + ' C');
                
 //      			this.sendNotification("INDOOR_TEMPERATURE", {data: value});
                
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
                  $('<span/>').addClass('small light').addClass(TrendIcon)
                ).append(
                  $('<span/>').addClass('small light').append(formatter.value(type, valueMin) + ' - ' + formatter.value(type, valueMax))
                )
                .appendTo(result);
                break;
              default:
            }
            return result;
          },
          
          displayHum: function(module){
            var result = $('<td/>').addClass('displayHum');
            switch(module.type){
              case this.moduleType.MAIN:
              case this.moduleType.INDOOR:             
              case this.moduleType.OUTDOOR:
				
				var type = 'Humidity'; 
                var value = module.dashboard_data[type];			
				
				if (value >= 40 && value <= 60){
					status = 'textgreen';
				}else if (value < 40 && value > 30 || value < 70 && value > 60){
					status = 'textorange';
				}else if (value <= 30 || value >= 70){
					status = 'textred';
				}

                $('<div/>').addClass(type).append(
					$('<div/>').addClass('large light').append(formatter.value(type, value))
                ).append(
					$('<div/>').addClass('fa fa-tint').addClass(status)
                ).appendTo(result);
    
                break;
              
              default:
                break;
            }
            return result;
          },
          displayExtra: function(module){
            var result = $('<td/>').addClass('displayExtra');
            switch(module.type){
              case this.moduleType.MAIN:
              case this.moduleType.INDOOR:

                var valueCO2 = module.dashboard_data['CO2'];
                var valuePressure = module.dashboard_data['Pressure'];
                var valueNoise = module.dashboard_data['Noise'];
                             
                var statusCO2 = valueCO2 > 2000?'bad':valueCO2 > 1000?'average':'good';
                
				//j'en sais rien moi ce qu'est une bonne pression atmospherique...
				if (valuePressure >= 1010 && valuePressure <= 1030){
					statusPressure = 'good';
				}else{
					statusPressure = 'average';
				}
				
				//70dB aspirateur. 40dB : bibliotheque...
				var statusNoise = valueNoise > 65?'bad':valueNoise > 40?'average':'good';
				                
				var valueWiFi = module.wifi_status;
				var statusWiFi = valueWiFi < 40?'textred':valueWiFi < 70?'textorange':'textgreen';

				//et on affiche tout ca !
                $('<div/>').addClass('').append(
                  $('<div/>').addClass('visual small').addClass(statusCO2)
                ).append(
                  $('<div/>').addClass('small value').append('CO² : ' + formatter.value('CO2', valueCO2))
                ).append(
                  $('<div/>').addClass('visual small').addClass(statusPressure)
                ).append(
                  $('<div/>').addClass('small value').append('Pression :' + formatter.value('Pressure', valuePressure))
                ).append(
                  $('<div/>').addClass('visual small').addClass(statusNoise)
                ).append(
                  $('<div/>').addClass('small value').append('Bruit : ' + formatter.value('Noise', valueNoise))
                )           
                .appendTo(result);                     
                
                break;
                
              case this.moduleType.OUTDOOR:
              //on va afficher ici le AirQuality
              
              var statusAirQuality = AirQualityValue < 50?'textgreen':AirQualityValue < 100?'textorange':'textred';

                              
                $('<div/>').addClass('').append(
					$('<div/>').addClass('large light').append(AirQualityImpact)
                ).append(
					$('<span/>').addClass('fa fa-leaf').addClass(statusAirQuality)
				).append(
					$('<span/>').addClass('small value').append(AirQualityValue)
                ).appendTo(result);
                            
              default:
                break;
            }
            return result;
          },
          
          displayInfos: function(module){ //module en ligne en bas
            var result = $('<td/>').addClass('');
            switch(module.type){
              case this.moduleType.MAIN: //le module intérieur principal

				var valueWiFi = module.wifi_status;
				var statusWiFi = valueWiFi < 40?'textred':'';
			//	var statusWiFi = valueWiFi < 40?'textred':valueWiFi < 70?'textorange':'textgreen';
	            
				//et on affiche 
				$('<td/>').addClass('').append(
                  $('<span/>').addClass('fa fa-wifi').addClass(statusWiFi)
                ).append(
                  $('<span/>').addClass('updated xsmall').append(' WiFi : ' + formatter.value('WiFi', valueWiFi) + ' - ')
                ).append(
                  $('<span/>').addClass('fa fa-clock-o')
                ).append(
                  $('<span/>').addClass('updated xsmall').append("Données : "+ moment.unix(lastUpdateServeurNetatmo).format('dd - HH:mm:ss'))
                )              
                .appendTo(result);      
				
                break;


              case this.moduleType.OUTDOOR: //le module extérieur
                                          
                var valueBattery = module.battery_percent;
                var valueRadio = module.rf_status;
                
                var statusBattery = valueBattery < 30?'textred fa fa-battery-1 fa-fw':valueBattery < 70?'fa fa-battery-2 fa-fw':'fa fa-battery-4 fa-fw';
				var statusRadio = valueRadio < 30?'textred':'';

				//et on affiche tout ca !
                $('<div/>').addClass('').append(
                  $('<span/>').addClass(statusBattery)
                ).append(
                  $('<span/>').addClass('updated xsmall').append(valueBattery +'% - ')
                ).append(
                  $('<span/>').addClass('fa fa-signal fa-fw').addClass(statusRadio)
                ).append(
                  $('<span/>').addClass('updated xsmall').append('Radio : ' + valueRadio + '%')
                )              
                .appendTo(result);                                     
                
                break;

              default:
                break;
            }
            return result;
          },
        };
      })(formatter, translator, that) // fin du design bubbles
    }[design]
  },

  getScripts: function() {
//	      Log.log("Netatmo : getScripts");//AgP - 1 fois au lancement du miroir
    return [
      'aqiFeed.js', //AirQuality
      'String.format.js',
      '//cdnjs.cloudflare.com/ajax/libs/jquery/2.2.2/jquery.js',
      'q.min.js',
      'moment.js'
    ];
  },
  getStyles: function() {
	//      Log.log("Netatmo : getStyles");//AgP - 1 fois au lancement du miroir
    return [
      'netatmo.css', 'font-awesome.css'
    ];
  },
	
  getTranslations: function() {
    //Log.log("Netatmo : getTranslations");//AgP - 1 fois au lancement du miroir
    return {
      en: 'l10n/en.json',
      de: 'l10n/de.json',
      fr: 'l10n/fr.json',
      cs: 'l10n/cs.json',
      nb: 'l10n/nb.json'
    };
  },
  
  getDom: function() {
	     
	Log.log("Netatmo : getDom");//AgP - Toutes les 3 min (update interval), étape 7 (finale) de l'update

    var dom = $('<div/>').addClass('netatmo');
    if(this.dom){ //si on a des infos : on les affiche
      dom.append(
        this.dom
      );

    }else{
      dom.append($( //sinon on met un cercle qui tourne
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
