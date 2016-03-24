var netatmo = {
	id: 'netatmo',
	lang: config.lang || 'nl',
	location: '.netatmo',
	params: "access_token=",
	access_token: null,
	refreshToken: config && config.netatmo && config.netatmo.refresh_token,
	refreshInterval: config && config.netatmo && config.netatmo.refreshInterval || 1,
	hideLoadTimer: config && config.netatmo && config.netatmo.hideLoadTimer,
	fadeInterval: 1000,
	translate:{
		sensorType: {
			'CO2': 'wi-na',
			'Humidity': 'wi-humidity',
			'Noise': 'wi-na',
			'Pressure': 'wi-barometer',
			'Temperature': 'wi-thermometer',
			'Rain': 'wi-raindrops',
			'Wind': 'wi-na'
		}
	},
	api: {
		base: 'https://api.netatmo.com/',
		auth_endpoint: 'oauth2/token',
		data_endpoint: 'api/getstationsdata'
	},
	init: function(){
		netatmo.loader = $('#netatmo-module .loadTimer .loader')[0];
  		netatmo.border = $('#netatmo-module .loadTimer .border')[0];
  		netatmo.α = 0;
		netatmo.t = netatmo.refreshInterval * 60 * 1000 / 360;
		if(netatmo.hideLoadTimer){
			$(".loadTimer").hide();
		}
		// run timer
		netatmo.update.load();
		// add string format method
		if (!String.prototype.format) {
		  String.prototype.format = function() {
			var args = arguments;
			return this.replace(/{(\d+)}/g, function(match, number) { 
			  return typeof args[number] != 'undefined'
				? args[number]
				: match
			  ;
			});
		  };
		}
	},
	update: {
		load: function(){
			return Q.fcall(
				netatmo.load.token, netatmo.render.error
			).then(
				netatmo.load.data, netatmo.render.error
			).then(
				netatmo.render.all
			).then(
				netatmo.update.wait
			);//.done();
		},
		wait: function(){
			netatmo.α++;
			netatmo.α %= 360;
			var r = ( netatmo.α * Math.PI / 180 )
			, x = Math.sin( r ) * 125
			, y = Math.cos( r ) * - 125
			, mid = ( netatmo.α > 180 ) ? 1 : 0
			, anim = 'M 0 0 v -125 A 125 125 1 ' 
			   + mid + ' 1 ' 
			   +  x  + ' ' 
			   +  y  + ' z';
			netatmo.loader.setAttribute( 'd', anim );
			netatmo.border.setAttribute( 'd', anim );
			if(r === 0){
				// refresh data
				netatmo.update.load();
			}else{
				// wait further
				setTimeout(netatmo.update.wait, netatmo.t);
			}
		}
	},
	load: {
		token: function(){
			return Q(
				$.ajax({
					type: 'POST',
					url: netatmo.api.base + netatmo.api.auth_endpoint,
					data: 'grant_type=refresh_token'
						+'&refresh_token='+netatmo.refreshToken
						+'&client_id='+config.netatmo.client_id
						+'&client_secret='+config.netatmo.client_secret
				})
			);
		},
		data: function(data){
			// call for station data
			console.log("Netatmo-Module: token loaded "+data.access_token);
			netatmo.refreshToken = data.refresh_token;
			netatmo.accessToken = data.access_token;
			return Q(
				$.ajax({
					url: netatmo.api.base + netatmo.api.data_endpoint,
					data: netatmo.params + netatmo.accessToken
				})
			);
		}
	},
	html:{
		moduleWrapper: '<div class="modules">{0}</div>',
		module: '<div class="module"><div class="data">{0}</div><div class="name small">{1}</div></div>',
		dataWrapper: '<table class>{0}</table>',
		data: '<tr><td class="small">{0}</td><td class="value small">{1}</td></tr>'
	},
	render: {
		all: function(data){
			var sContent = '';
			var device = data.body.devices[0];
			console.log("Netatmo-Module: data loaded, last updated "+new Date(1000*device.dashboard_data.time_utc));
			// render modules
			sContent += netatmo.render.modules(device);
			// place content
			$(netatmo.location).updateWithText(
				sContent, 
				netatmo.fadeInterval
			);
			return Q({});
		},
		modules: function(device){
			var sResult = '';
			var aOrderedModuleList = config.netatmo.moduleOrder && config.netatmo.moduleOrder.length > 0
				?config.netatmo.moduleOrder
				:null;
			
			if(aOrderedModuleList){
				for(var moduleName of aOrderedModuleList){
					if(device.module_name === moduleName){
						sResult += netatmo.render.module(device);
					}else{
						for(var module of device.modules){
							if(module.module_name === moduleName){
								sResult += netatmo.render.module(module);
								break;
							}
						}
					}
				}
			}else{
				//render station data (main station)
				sResult += netatmo.render.module(device);
				//render module data (connected modules)
				for(cnt = 0; cnt < device.modules.length; cnt++){
					sResult += netatmo.render.module(device.modules[cnt]);
				}
			}
			return netatmo.html.moduleWrapper.format(sResult);
		},
		module: function(oModule){
			return netatmo.html.module.format(
				netatmo.render.sensorData(oModule),
				oModule.module_name
			);
		},
		sensorData: function(oModule){
			var sResult = '';
			var aDataTypeList = config.netatmo.dataOrder && config.netatmo.dataOrder.length > 0
				?config.netatmo.dataOrder
				:oModule.data_type;
			for(var dataType of aDataTypeList){
				if($.inArray(dataType, oModule.data_type) > -1){
					sResult += netatmo.render.data(
						netatmo.translate.sensorType[dataType] || 'wi-na', 
						dataType, 
						oModule.dashboard_data[dataType]);
				}
			}
			return netatmo.html.dataWrapper.format(sResult);
		},
		data: function(clazz, dataType, value){
			return netatmo.html.data.format(dataType, value.toFixed(1));
		},
		error: function(reason){
			console.log("error " +reason);
			$(netatmo.location).updateWithText(
				"could not load data: "+reason.responseJSON.error, 
				netatmo.fadeInterval
			);
		}
	}
};
