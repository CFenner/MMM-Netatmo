var netatmo = {
	id: 'netatmo',
	lang: config.lang || 'nl',
	params: config && config.netatmo && config.netatmo.params || "access_token=",
	token: null,
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
		servlet: '/netatmo-module/servlet.php',
		base: 'https://api.netatmo.com/api/',
		endpoint: 'getstationsdata'
	},
	location: '.netatmo',
	fadeInterval: config.weather.fadeInterval || 1000,
	init: function(){
		netatmo.load.data();
		
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
	load: {
		data: function(){
			Q.fcall(function(){
				// call for token
				return Q(
					$.ajax(netatmo.api.servlet)
				);
			}, function(reason){
				console.log("error " +reason);
			}).then(function(data){
				// call for station data
				console.log("Done: "+data);
				netatmo.token = data;
				return Q(
					$.ajax({
						url: netatmo.api.base + netatmo.api.endpoint,
						data: netatmo.params + netatmo.token
					})
				);
			}, function(reason){
				console.log("error " +reason);
			}).then(function(data){
				netatmo.render.all(data);
			}).done();
		}
	},
	html:{
		moduleWrapper: '<div class="modules">{0}</div>',
		module: '<div class="module"><div class="data">{0}</div><div class="name small">{1}</div></div>',
		dataWrapper: '<table class>{0}</table>',
		data: '<tr><td class="small">{0}</td><td class="value small">{1}</td></tr>'
//		data: '<div><span class="small i2con ">{0}</span>&nbsp;<span class="value small">{1}</span></div>'
	},
	render: {
		all: function(data){
			var sContent = '';
			var device = data.body.devices[0];
			// render modules
			sContent += netatmo.render.modules(device);
			// place content
			$(netatmo.location).updateWithText(
				sContent, 
				netatmo.fadeInterval
			);
		},
		modules: function(device){
			var sResult = '';
			//render station data (main station)
			sResult += netatmo.render.module(device);
			//render module data (connected modules)
			for(cnt = 0; cnt < device.modules.length; cnt++){
				sResult += netatmo.render.module(device.modules[cnt]);
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
		}
	}
};
