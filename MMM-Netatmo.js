/* Magic Mirror Module: Netatmo
 * inspired
 * By Christopher Fenner http://github.com/CFenner
 * MIT Licensed.
 */

/* global $, Q, moment, Module, Log */

// Manage the PIR and the module.hidden at the same time
var UserPresence = true; // by default we are present (no PIR sensor to cut)
var ModuleNetatmoHidden = false; /// by default  display the module (if no carousel module or other)

var lastUpdateServeurNetatmo = 0; // Used to memorize the timestamp given by netatmo on the date of his info. New info every 10 min
var DateUpdateDataAirQuality = 0; // The last date we updated the info Air Quality min

var AirQualityImpact = "Wait..";
var AirQualityValue = 0; //Initial air quality

//Mapping Modules and order. This way they can be referenced from any function.
let ModuleMap = new Map();
// Map devicenames to Devicetypes
let ModuleTypeMap = new Map();
//let NAValue = "--";
let NAValue = "NA";

const NetatmoModuleType = {
	MAIN: "NAMain",
	INDOOR: "NAModule4",
	OUTDOOR: "NAModule1",
	RAIN: "NAModule3",
	WIND: "NAModule2",
	HEALTH: "NHC",
};

const NetatmoDataType = {
	BATTERY: "battery_percent",
	CO2: "CO2",
	FIRMWARE: "firmware",
	GUST_STRENGTH: "GustStrength",
	GUST_ANGLE: "GustAngle",
	HUMIDITY: "Humidity",
	LAST_MESSAGE: "last_message",
	LAST_SEEN: "last_seen",
	NOISE: "Noise",
	PRESSURE: "Pressure",
	PRESSURE_TREND: "pressure_trend",
	PRESSURE_ABSOLUTE: "AbsolutePressure",
	RAIN: "Rain",
	RADIO: "rf_status",
	SUM_RAIN_1: "sum_rain_1",
	SUM_RAIN_24: "sum_rain_24",
	TEMPERATURE: "Temperature",
	TEMP_MIN: "min_temp",
	TEMP_MAX: "max_temp",
	TEMP_TREND: "temp_trend",
	WIFI: "wifi_status",
	WIND: "Wind",
	WIND_STRENGTH: "WindStrength",
	WIND_ANGLE: "WindAngle",
	HEALTH_IDX: "health_idx", //Air Quality Health Index
};

Module.register("MMM-Netatmo", {
	// default config,
	defaults: {
		//for AirQuality
		lang: config.language,
		location: "germany/berlin",
		updateIntervalAirQuality: 600, // en secondes = every 30 minutes
		refreshToken: null,
		updatesIntervalDisplay: 60,
		animationSpeed: 1000,
		updatesIntervalDisplayID: 0,
		showDataIcon: true,
		showDataHeader: true,
		showModuleStatus: true,
		showModuleFirmware: true,
		NAValue: "--",
		api: {
			base: "https://api.netatmo.com/",
			authEndpoint: "oauth2/token",
			authPayload: "grant_type=refresh_token&refresh_token={0}&client_id={1}&client_secret={2}",
			dataEndpoint: "api/getstationsdata",
			dataPayload: "access_token={0}"
		}
	},

	// init method
	start: function () {
		Log.info("Starting module: " + this.name);//First time at the launch of the mirror

		// run upload for the first time, everyone will remember their upload date
		this.updateLoad();
		this.loadAirQuality();
		// is useless because called by resume and values ​​of dates have no time to memorize before...
		// if it serves, because resume is not always called at startup ...

		// set a timer to manage uploads and displays whether or not there is a presence
		this.config.updatesIntervalDisplayID = setInterval(() => {
			this.GestionUpdateIntervalNetatmo();
		}, this.config.updatesIntervalDisplay * 1000);

		//	Log.log("End function start, updatesIntervalDisplayID : " + this.config.updatesIntervalDisplayID);

	},

	suspend: function () { // core called when the module is hidden
		ModuleNetatmoHidden = true; //module hidden
		Log.log("Suspend - Module Netatmo hidden");
		this.GestionUpdateIntervalNetatmo(); //when called the function that handles all cases
	},

	resume: function () { // core called when the module is displayed
		ModuleNetatmoHidden = false;
		Log.log("Resume - Module Netatmo display");
		this.GestionUpdateIntervalNetatmo();
	},

	notificationReceived: function (notification, payload) {
		if (notification === "USER_PRESENCE") { // notification sent by the MMM-PIR-Sensor module. See his doc
			Log.log("NotificationReceived USER_PRESENCE = " + payload);
			UserPresence = payload;
			this.GestionUpdateIntervalNetatmo();
		}
	},

	GestionUpdateIntervalNetatmo: function () {

		Log.log("GestionUpdateIntervalNetatmo - Netatmo data: "
			+ moment.unix(lastUpdateServeurNetatmo).format("dd - HH:mm:ss") +
			" - AirQuality data : " + moment.unix(DateUpdateDataAirQuality).format("dd - HH:mm:ss") +
			" - and we are : " + moment.unix(Date.now() / 1000).format("dd - HH:mm:ss"));

		// make sure to have a user present in front of the screen (sensor PIR) and that the module is well displayed
		if (UserPresence === true && ModuleNetatmoHidden === false) {

			Log.log("Netatmo is displayed and user present! We need to update if necessary");

			if (Date.now() / 1000 - DateUpdateDataAirQuality > this.config.updateIntervalAirQuality) {
				Log.log("Data AirQuality have more than " + this.config.updateIntervalAirQuality + " s, update requested");
				this.loadAirQuality();
			} else {
				var calcul = Date.now() / 1000 - DateUpdateDataAirQuality;
				Log.log("Data AirQuality ont :" + calcul +
					"it's less " + this.config.updateIntervalAirQuality + " s, we do not update");

			}

			if (Date.now() / 1000 - lastUpdateServeurNetatmo > 660) {// we are more than 11min after the last datas of the server -> it is necessary to update

				Log.log("Data Netatmo have more than 11 min, update requested");
				this.updateLoad();
			} else {
				Log.log("Data Netatmo are less than 11 min, no update");
			}

			//Reset the update interval, if not already active (to avoid multiple instances)
			if (this.config.updatesIntervalDisplayID === 0) {

				this.config.updatesIntervalDisplayID = setInterval(() => {
					this.GestionUpdateIntervalNetatmo();
				}, this.config.updatesIntervalDisplay * 1000);

				Log.log("Netatmo timer in place, updatesIntervalDisplayID : " + this.config.updatesIntervalDisplayID);

			}

		} else { //sinon (UserPresence = false OU ModuleHidden = true)

			clearInterval(this.config.updatesIntervalDisplayID); // stop the current update interval
			this.config.updatesIntervalDisplayID = 0; // we reset the variable
		}
	},

	//Air Quality
	loadAirQuality: function () {

		//	Log.log("Fct loadAirQuality - OK DATA LOAD.");
		_aqiFeed({
			lang: this.config.lang,
			city: this.config.location,
			callback: this.renderAirQuality.bind(this) // error log here when fct called 2 times too close. Not impact
		});
	},

	renderAirQuality: function (data) {

		AirQualityValue = $(data.aqit).find("span").text();
		AirQualityImpact = data.impact;

		//We memorize the date of our data upload
		DateUpdateDataAirQuality = Date.now() / 1000;

		//Log.log("renderAirQuality at "+ moment.unix(DateUpdateDataAirQuality).format('dd - HH:mm:ss') +" - value : " + AirQualityValue + ' - impact : '+ AirQualityImpact);

	},

	//fin airquality

	updateLoad: function () {
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
		token: function () {

			//Log.log("Netatmo : load - token");
			return Q($.ajax({
				type: "POST",
				url: this.config.api.base + this.config.api.authEndpoint,
				data: this.config.api.authPayload.format(
					this.config.refreshToken,
					this.config.clientId,
					this.config.clientSecret)
			}));
		},

		data: function (data) {

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

	renderAll: function (data) {

		// Log.log("Netatmo : renderAll");
		// Log.info(this.name + " data loaded, updated "+moment(new Date(1000*device.dashboard_data.time_utc)).fromNow());
		var device = data.body.devices[0];
		this.lastUpdate = device.dashboard_data.time_utc;
		lastUpdateServeurNetatmo = device.dashboard_data.time_utc;
		// render modules
		this.dom = this.getDesign("bubbles").render(device);
		this.updateDom(this.config.animationSpeed);
		return Q({});
	},

	renderError: function (reason) {
		console.log("error " + reason);
	},
	formatter: {
		value: function (dataType, value) {
			if (!value || value === NAValue) { return value; }
			switch (dataType) {
				case NetatmoDataType.CO2:
					return value.toFixed(0);
				case NetatmoDataType.NOISE:
					return value.toFixed(0);
				case NetatmoDataType.HUMIDITY:
					return value.toFixed(0);
				case NetatmoDataType.RAIN:
				case NetatmoDataType.SUM_RAIN_1:
				case NetatmoDataType.SUM_RAIN_24:
					return value.toFixed(1);
				case NetatmoDataType.WIND:
				case NetatmoDataType.WIND_STRENGTH:
					if (value > 0) { return value.toFixed(0) + " km/Std"; }
					return "NA";
				case NetatmoDataType.WIND_ANGLE:
					if (value < 0) { return " "; }
					var tailval = " | " + value + "°";
					if (value < 11.25) { return "N" + tailval; }
					if (value < 33.75) { return "NNE" + tailval; }
					if (value < 56.25) { return "NE" + tailval; }
					if (value < 78.75) { return "ENE" + tailval; }
					if (value < 101.25) { return "E" + tailval; }
					if (value < 123.75) { return "ESE" + tailval; }
					if (value < 146.25) { return "SE" + tailval; }
					if (value < 168.75) { return "SSE" + tailval; }
					if (value < 191.25) { return "S" + tailval; }
					if (value < 213.75) { return "SSW" + tailval; }
					if (value < 236.25) { return "SW" + tailval; }
					if (value < 258.75) { return "WSW" + tailval; }
					if (value < 281.25) { return "W" + tailval; }
					if (value < 303.75) { return "WNW" + tailval; }
					if (value < 326.25) { return "NW" + tailval; }
					if (value < 348.75) { return "NNW" + tailval; }
					return "N" + tailval;
				case NetatmoDataType.HEALTH_IDX: //Air Quality Health Index
					if (value = 0) { return "Healthy"; }
					if (value = 1) { return "Fine"; }
					if (value = 2) { return "Fair"; }
					if (value = 3) { return "Poor"; }
					if (value = 4) { return "Unhealthy"; }
				case NetatmoDataType.BATTERY:
				case NetatmoDataType.RADIO:
					return value.toFixed(0);
				case NetatmoDataType.WIFI:
				case NetatmoDataType.PRESSURE:
					return value.toFixed(0);
				case NetatmoDataType.TEMPERATURE:
					return value.toFixed(1);
				case NetatmoDataType.TEMP_MIN:
				case NetatmoDataType.TEMP_MAX:
					return value.toFixed(1);
				default:
					return value;
			}
		},
		unit: function (dataType) {
			switch (dataType) {
				case NetatmoDataType.CO2:
					return " ppm";
				case NetatmoDataType.NOISE:
					return " dB";
				case NetatmoDataType.HUMIDITY:
				case NetatmoDataType.BATTERY:
				case NetatmoDataType.RADIO:
					return " %";
				case NetatmoDataType.WIFI:
					return " dBm";
				case NetatmoDataType.RAIN:
					return " mm";
				case NetatmoDataType.SUM_RAIN_1:
					return " 1h";
				case NetatmoDataType.SUM_RAIN_24:
					return " 24h";
				case NetatmoDataType.WIND:
				case NetatmoDataType.WIND_STRENGTH:
					return " km/h";
				case NetatmoDataType.PRESSURE:
					return " mBar";
				case NetatmoDataType.WIND_ANGLE:
				case NetatmoDataType.TEMPERATURE:
				case NetatmoDataType.TEMP_MIN:
				case NetatmoDataType.TEMP_MAX:
					return "°";
				default:
					return "";
			}
		},
		icon: function (dataType, value) {
			switch (dataType) {
				case NetatmoDataType.PRESSURE_TREND:
				case NetatmoDataType.TEMP_TREND:
					return value === "up" ? "fa fa-caret-up" : value === "down" ? "fa fa-caret-down" : value === "stable" ? "fa fa-caret-right" : "";
				case NetatmoDataType.CO2:
					return "";
				case NetatmoDataType.NOISE:
					//70dB vacuum cleaner. 40dB: library
					return value > 70 ? "fa fa-volume-up" : value > 50 ? "fa fa-volume-down" : "fa fa-volume-off";
				case NetatmoDataType.HUMIDITY:
					return "wi wi-humidity";
				case NetatmoDataType.BATTERY:
					return value > 95 ? "fa fa-battery-full" : value >= 70 ? "fa fa-battery-three-quarters" : value >= 45 ? "fa fa-battery-half" : value >= 15 ? "fa fa-battery-quarter" : "fa fa-battery-empty";
				case NetatmoDataType.WIFI:
					return "fa fa-wifi";
				case NetatmoDataType.RADIO:
					return "fa fa-signal";
				//return "fa fa-signal fa-fw";
				case NetatmoDataType.RAIN:
				case NetatmoDataType.SUM_RAIN_1:
				case NetatmoDataType.SUM_RAIN_24:
					return "wi wi-raindrop";
				case NetatmoDataType.WIND:
				case NetatmoDataType.WIND_STRENGTH:
					return "";
				case NetatmoDataType.WIND_ANGLE:
					if (value < 0) { return " "; }
					var tailval = " | " + value + "°";
					if (value < 11.25) { return "N" + tailval; }
					if (value < 33.75) { return "NNE" + tailval; }
					if (value < 56.25) { return "NE" + tailval; }
					if (value < 78.75) { return "ENE" + tailval; }
					if (value < 101.25) { return "E" + tailval; }
					if (value < 123.75) { return "ESE" + tailval; }
					if (value < 146.25) { return "SE" + tailval; }
					if (value < 168.75) { return "SSE" + tailval; }
					if (value < 191.25) { return "S" + tailval; }
					if (value < 213.75) { return "SSW" + tailval; }
					if (value < 236.25) { return "SW" + tailval; }
					if (value < 258.75) { return "WSW" + tailval; }
					if (value < 281.25) { return "W" + tailval; }
					if (value < 303.75) { return "WNW" + tailval; }
					if (value < 326.25) { return "NW" + tailval; }
					if (value < 348.75) { return "NNW" + tailval; }
					return "N" + tailval;
				case NetatmoDataType.PRESSURE:
					return "wi wi-barometer";
				case NetatmoDataType.TEMPERATURE:
				case NetatmoDataType.TEMP_MIN:
					return "fa fa-thermometer-empty";
				case NetatmoDataType.TEMP_MAX:
					return "fa fa-thermometer-full";
				default:
					return "";
			}
		},
		status: function (dataType, value) {
			if (!value) { return ""; }
			switch (dataType) {
				case NetatmoDataType.CO2:
					return value <= 800 ? "good" : value <= 1600 ? "average" : "bad";
				case NetatmoDataType.NOISE:
					//70dB vacuum cleaner. 40dB: library
					return value > 70 ? "textred" : value > 50 ? "textorange" : "textgreen";
				case NetatmoDataType.BATTERY:
					return value >= 70 ? "textgreen" : value >= 45 ? "textyellow" : value >= 15 ? "textorange" : "textred";
				case NetatmoDataType.WIFI:
					return value < 60 ? "textgreen" : value < 86 ? "textorange" : "textred";
				case NetatmoDataType.RADIO:
					return value >= 70 ? "textgreen" : value >= 45 ? "textyellow" : value >= 15 ? "textorange" : "textred";
				case NetatmoDataType.HUMIDITY:
					let status = "";
					if (value >= 40 && value <= 60) {
						status = "textgreen";
					} else if (value < 40 && value > 30 || value < 70 && value > 60) {
						status = "textorange";
					} else if (value <= 30) {
						status = "textred";
					} else if (value >= 70) {
						status = "textpurple";
					}
					return status;
				default:
					return "";
			}
		}

	},

	clazz: function (dataType) {
		switch (dataType) {
			case "CO2":
				return "wi-na";
			case "Noise":
				return "wi-na";
			case "Humidity":
				return "wi-humidity";
			case "Pressure":
				return "wi-barometer";
			case "Temperature":
				return "wi-thermometer";
			case "Rain":
				return "wi-raindrops";
			case "Wind":
				return "wi-na";
			default:
				return "";
		}
	},

	getDesign: function (design) {

		//	Log.log("Netatmo : getDesign");

		var that = this;
		var formatter = this.formatter;
		var translator = this.translate;
		var WindValue = -1;
		var WindAngleValue = -1;
		var RainValue = -1;

		return {
			bubbles: (function (formatter, translator, that) {
				return {
					getValue: function (module, datatype, isDashboardData, translate) {
						let value;
						if (isDashboardData) {
							value = typeof module.dashboard_data !== "undefined" ? (module.dashboard_data[datatype]) : NAValue;
						}
						else {
							value = typeof module[datatype] !== "undefined" ? (module[datatype]) : NAValue;
						}
						return value = (translate) ? translator.bind(that)(value.toUpperCase()) : value;
					},
					render: function (device) {
						ModuleMap = new Map();
						if (that.config.NAValue && that.config.moduleOrder.length > 0) { NAValue = that.config.NAValue; }
						Log.log("start render");
						var sResult = $("<div/>").addClass("modules").addClass("bubbles");
						Log.log("sresult: " + sResult);
						if (that.config.moduleOrder && that.config.moduleOrder.length > 0) {
							for (var moduleName of that.config.moduleOrder) {
								if (device.module_name.toUpperCase() === moduleName.toUpperCase()) {
									Log.log("Device will be mapped: " + device.module_name);
									ModuleMap.set(device.module_name, device);
									ModuleTypeMap.set(device.type, device.module_name);
								} else {
									for (var module of device.modules) {
										if (module.module_name.toUpperCase() === moduleName.toUpperCase()) {
											Log.log("Module will be mapped: " + module.module_name);
											ModuleMap.set(module.module_name, module);
											if (module.type === NetatmoModuleType.INDOOR) {
												let indoor = [];
												if (ModuleTypeMap.has(NetatmoModuleType.INDOOR)) { let indoor = ModuleTypeMap.has(NetatmoModuleType.INDOOR); }
												indoor.push(module.module_name);
												ModuleTypeMap.set(module.type, indoor);
											}
											else {
												ModuleTypeMap.set(module.type, module.module_name);
											}
										}
									}
								}
							}
						}
						else {
							Log.log("Device will be mapped: " + device.module_name);
							ModuleMap.set(device.module_name, device);
							//ModuleTypeMap.set(device.type, device.module_name);
							for (var cnt = 0; cnt < device.modules.length; cnt++) {
								Log.log("Module will be mapped: " + device.modules[cnt].module_name);
								ModuleMap.set(device.modules[cnt].module_name, device.modules[cnt]);
								if (device.modules[cnt].type === NetatmoModuleType.INDOOR) {
									let indoor = [];
									if (ModuleTypeMap.has(NetatmoModuleType.INDOOR)) { let indoor = ModuleTypeMap.has(NetatmoModuleType.INDOOR); }
									indoor.push(device.modules[cnt].module_name);
									ModuleTypeMap.set(device.modules[cnt].type, indoor);
								}
								else {
									ModuleTypeMap.set(device.modules[cnt].type, device.modules[cnt].module_name);
								}
							}
						}

						if (ModuleMap && ModuleMap.size > 0) {
							for (let [moduleName, module] of ModuleMap) {
								switch (module.type) {
									case NetatmoModuleType.MAIN:
									case NetatmoModuleType.INDOOR:
										sResult.append(this.module(module));
										break;
									case NetatmoModuleType.OUTDOOR:
										//sResult.append(this.moduleOutdoor(module));
										sResult.append(this.module(module));
										break;

									case NetatmoModuleType.WIND:
										//TODO Wind choose own or in outdoor
										if (module.dashboard_data === undefined) {
											break;
										}
										//if wind is rendered after OUTDOOR, value will never be displayed
										WindValue = module.dashboard_data["WindStrength"];
										WindAngleValue = module.dashboard_data["WindAngle"];

										break;

									case NetatmoModuleType.RAIN:
										sResult.append(this.module(module));
										break;

									//TODO rain choose own or in outdoor
									// if (module.dashboard_data === undefined) {
									// 	break;
									// }
									// //if rain is rendered after OUTDOOR, value will never be displayed
									// RainValue = module.dashboard_data["Rain"];

									//break;
								}
							}
						}
						Log.log("ModuleTypeMap: " + ModuleTypeMap.size);
						for (let [key, value] of ModuleTypeMap) {
							Log.log(key + " = " + value);
						}
						return sResult;
					},

					// moduleMain: function (module) {
					// 	var type;
					// 	var value;
					// 	var result = $("<div/>").addClass("module").append(
					// 		$("<div/>").addClass("name small").append(module.module_name)
					// 	).append(
					// 		$("<div/>").append(
					// 			$("<table/>").append(
					// 				$("<tr/>").append(
					// 					this.displayTemp(module)
					// 				).append(
					// 					this.displayMainSecondary(module)
					// 				)//finsh tr
					// 			)//finsh table
					// 		)//finsh div
					// 	).append(
					// 		$("<div/>").addClass("align-left").append(this.displayInfos(module))
					// 	).append(
					// 		$("<div/>").addClass("line")
					// 	);
					// 	return result[0].outerHTML;
					// },

					// moduleIndoor: function (module) {
					// 	var type;
					// 	var value;
					// 	var result = $("<div/>").addClass("module").append(
					// 		$("<div/>").addClass("name small").append(module.module_name)
					// 	).append(
					// 		$("<div/>").append(
					// 			$("<table/>").append(
					// 				$("<tr/>").append(
					// 					this.displayTemp(module)
					// 				).append(
					// 					this.displayIndoorSecondary(module)
					// 				)//finsh tr
					// 			)//finsh table
					// 		)//finsh div
					// 	).append(
					// 		$("<div/>").addClass("align-left").append(this.displayInfos(module))
					// 	).append(
					// 		$("<div/>").addClass("line")
					// 	);
					// 	return result[0].outerHTML;
					// },

					// moduleOutdoor: function (module) {
					// 	var type;
					// 	var value;
					// 	var result = $("<div/>").addClass("module").append(
					// 		$("<div/>").addClass("name small").append(module.module_name)
					// 	).append(
					// 		$("<div/>").append(
					// 			$("<table/>").append(
					// 				$("<tr/>").append(
					// 					this.displayTemp(module)
					// 				).append(
					// 					this.displayOutdoorSecondary(module)
					// 				)//finsh tr
					// 			)//finsh table
					// 		)//finsh div
					// 	).append(
					// 		$("<div/>").addClass("align-left").append(this.displayInfos(module))
					// 	).append(
					// 		$("<div/>").addClass("line")
					// 	);
					// 	return result[0].outerHTML;
					// },

					// moduleRain: function (module) {
					// 	var type;
					// 	var value;
					// 	var result = $("<div/>").addClass("module").append(
					// 		$("<div/>").addClass("name small").append(module.module_name)
					// 	).append(
					// 		$("<div/>").append(
					// 			$("<table/>").append(
					// 				$("<tr/>").append(
					// 					this.displayRain(module)
					// 				).append(
					// 					this.displayRainSecondary(module)
					// 				)//finsh tr
					// 			)//finsh table
					// 		)//finsh div
					// 	).append(
					// 		$("<div/>").addClass("align-left").append(this.displayInfos(module))
					// 	).append(
					// 		$("<div/>").addClass("line")
					// 	);
					// 	return result[0].outerHTML;
					// },

					//Defined the overall structure of the display of each element of the module (indoor, outdoor). The last line being in the getDom
					module: function (module) {
						var type;
						var value;
						Log.log("MMM-Netatmo add module: " + module.module_name);
						var result = $("<div/>").addClass("module").append(
							$("<div/>").addClass("title name xsmall").append(module.module_name)
						);
						this.addPrimary(module).appendTo(result);
						this.addSecondary(module).appendTo(result);
						this.addData(module).appendTo(result);
						if (that.config.showModuleStatus) { this.addStatus(module).appendTo(result); }
						$("<div/>").addClass("line").appendTo(result);
						return result[0].outerHTML;
					},

					addPrimary: function (module) {
						Log.log("MMM-Netatmo addPrimary module: " + module.module_name);
						let result = $("<div/>").addClass("primary");
						switch (module.type) {
							case NetatmoModuleType.MAIN:
							case NetatmoModuleType.INDOOR:
							case NetatmoModuleType.OUTDOOR:
								result.append(this.displayTempNieuw(module));
								break;
							case NetatmoModuleType.RAIN:
								result.append(this.displayRain(module));
								break;
							case NetatmoModuleType.WIND:
							default:
								break;

						}
						/*
						this.displayCO2(module).appendTo(result);
						this.displayHum(module).appendTo(result);
						this.displayPressure(module).appendTo(result);
						*/
						return result;
					},
					addSecondary: function (module) {
						Log.log("MMM-Netatmo addSecondary module: " + module.module_name);
						let result = $("<div/>").addClass("secondary");
						switch (module.type) {
							case NetatmoModuleType.MAIN:
							case NetatmoModuleType.INDOOR:
								result.append(this.displayCO2Nieuw(module));
								break;

							case NetatmoModuleType.OUTDOOR:
								result.append(this.displayAQI(module));
								break;

							case NetatmoModuleType.RAIN:
								result.append(this.displayRainDrops(module));
								break;
							case NetatmoModuleType.WIND:
							default:
								break;

						}
						/*
						this.displayCO2(module).appendTo(result);
						this.displayHum(module).appendTo(result);
						this.displayPressure(module).appendTo(result);
						*/
						return result;
					},
					addData: function (module) {
						Log.log("MMM-Netatmo addData module: " + module.module_name);
						let result = $("<div/>").addClass("displayData");
						switch (module.type) {
							case NetatmoModuleType.MAIN:
								Log.log("MMM-Netatmo addData module HUMIDITY");
								this.displayData(module, NetatmoDataType.HUMIDITY, true).appendTo(result);
								Log.log("MMM-Netatmo addData module NOISE");
								this.displayData(module, NetatmoDataType.NOISE, true).appendTo(result);
								Log.log("MMM-Netatmo addData module PRESSURE");
								this.displayData(module, NetatmoDataType.PRESSURE, true).appendTo(result);
								break;
							case NetatmoModuleType.INDOOR:
							case NetatmoModuleType.OUTDOOR:
								Log.log("MMM-Netatmo addData module HUMIDITY");
								this.displayData(module, NetatmoDataType.HUMIDITY, true).appendTo(result);

							case NetatmoModuleType.WIND:
							case NetatmoModuleType.RAIN:
							default:
								break;
						}
						/*
						this.displayCO2(module).appendTo(result);
						this.displayHum(module).appendTo(result);
						this.displayPressure(module).appendTo(result);
						*/
						return result;
					},
					addStatus: function (module) {
						Log.log("MMM-Netatmo addData module: " + module.module_name);
						let result = $("<div/>").addClass("displayStatus");
						switch (module.type) {
							case NetatmoModuleType.MAIN:
								Log.log("MMM-Netatmo addStatus module WIFI");
								this.displayData(module, NetatmoDataType.WIFI, false).appendTo(result);
								Log.log("MMM-Netatmo addStatus module RADIO");
								this.displayData(module, NetatmoDataType.RADIO, false).appendTo(result);
								Log.log("MMM-Netatmo addStatus module BATT");
								this.displayData(module, NetatmoDataType.BATTERY, false).appendTo(result);
								Log.log("MMM-Netatmo addStatus module FIRM");
								if (that.config.showModuleFirmware) {
									this.displayData(module, NetatmoDataType.FIRMWARE, false).appendTo(result);
								}
								break;
							case NetatmoModuleType.INDOOR:
							case NetatmoModuleType.OUTDOOR:
							case NetatmoModuleType.RAIN:
								Log.log("MMM-Netatmo addStatus module RADIO");
								this.displayData(module, NetatmoDataType.RADIO, false).appendTo(result);
								Log.log("MMM-Netatmo addStatus module BATT");
								this.displayData(module, NetatmoDataType.BATTERY, false).appendTo(result);
								Log.log("MMM-Netatmo addStatus module FIRM");
								if (that.config.showModuleFirmware) {
									this.displayData(module, NetatmoDataType.FIRMWARE, false).appendTo(result);
								}

							case NetatmoModuleType.WIND:

							default:
								break;
						}
						/*
						this.displayCO2(module).appendTo(result);
						this.displayHum(module).appendTo(result);
						this.displayPressure(module).appendTo(result);
						*/
						return result;
					},
					displayTempNieuw: function (module) {
						var result = $("<div/>").addClass("displayTemp");
						let datatype = NetatmoDataType.TEMPERATURE;
						let value = this.getValue(module, NetatmoDataType.TEMPERATURE, true, false);
						let valueMin = this.getValue(module, NetatmoDataType.TEMP_MIN, true, false);
						let valueMax = this.getValue(module, NetatmoDataType.TEMP_MAX, true, false);
						let valueTrend = this.getValue(module, NetatmoDataType.TEMP_TREND, true, false);

						// MAIN Data
						let divData = $("<div/>").addClass(datatype);
						let divDataContainer = $("<div/>").addClass("data_container");
						let divDataLeft = $("<div/>").addClass("data_left").addClass("large light bright").append(formatter.value(datatype, value));
						let divDataRight = $("<div/>").addClass("data_right").append(
							$("<div/>").addClass("small light bright").addClass("data_right_up").append(formatter.unit(datatype))
						).append(
							$("<div/>").addClass("medium light bright").addClass("data_right_down").addClass(formatter.icon(NetatmoDataType.TEMP_TREND, valueTrend))
						);

						divDataLeft.appendTo(divDataContainer);
						divDataRight.appendTo(divDataContainer);
						divDataContainer.appendTo(divData);

						// DATA TEMP MIN MAX
						let divDataContainerBottom = $("<div/>").addClass("data_container_align");
						let divDCBottomMin = $("<div/>").addClass("data_container");
						let divDCBottomMax = $("<div/>").addClass("data_container");
						let divDataIconMin = $("<div/>").addClass("data_icon").addClass("small light dimmed").addClass(formatter.icon(NetatmoDataType.TEMP_MIN));
						let divDataIconMax = $("<div/>").addClass("data_icon").addClass("small light dimmed").addClass(formatter.icon(NetatmoDataType.TEMP_MAX));
						let divDataLeftMin = $("<div/>").addClass("data_left").addClass("small").append(" " + formatter.value(datatype, valueMin));
						let divDataRightMin = $("<div/>").addClass("data_right").append(
							$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(NetatmoDataType.TEMP_MIN))
						);
						let divDataLeftMax = $("<div/>").addClass("data_left").addClass("small").append(" " + formatter.value(datatype, valueMax));
						let divDataRightMax = $("<div/>").addClass("data_right").append(
							$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(NetatmoDataType.TEMP_MAX))
						);
						divDataIconMin.appendTo(divDCBottomMin);
						divDataLeftMin.appendTo(divDCBottomMin);
						divDataRightMin.appendTo(divDCBottomMin);
						divDataIconMax.appendTo(divDCBottomMax);
						divDataLeftMax.appendTo(divDCBottomMax);
						divDataRightMax.appendTo(divDCBottomMax);
						divDCBottomMin.appendTo(divDataContainerBottom);
						divDCBottomMax.appendTo(divDataContainerBottom);
						divDataContainerBottom.appendTo(divData);
						divData.appendTo(result);
						return result;
					},

					displayCO2Nieuw: function (module) {

						let dataType = NetatmoDataType.CO2;
						let result = $("<div/>").addClass("displayCO2");
						let value = this.getValue(module, NetatmoDataType.CO2, true, false);

						$("<div/>").addClass(dataType).append(
							$("<div/>").addClass("small visual").addClass(formatter.status(dataType, value))
						).append(
							$("<div/>").addClass("small value").append(formatter.value(dataType, value) + formatter.unit(dataType, value))
						).appendTo(result);

						return result;
					},
					displayRain: function (module) {
						var result = $("<div/>").addClass("displayRain");
						let datatype = NetatmoDataType.RAIN;
						let value = this.getValue(module, NetatmoDataType.RAIN, true, false);
						let value1h = this.getValue(module, NetatmoDataType.SUM_RAIN_1, true, false);
						let value24h = this.getValue(module, NetatmoDataType.SUM_RAIN_24, true, false);

						// MAIN DATA
						let divData = $("<div/>").addClass(datatype);
						let divDataContainer = $("<div/>").addClass("data_container");
						let divDataLeft = $("<div/>").addClass("data_left").addClass("large light bright").append(formatter.value(datatype, value));
						let divDataRight = $("<div/>").addClass("data_right").append(
							$("<div/>").addClass("small light bright").addClass("data_right_up").append(formatter.unit(datatype))
						);

						divDataLeft.appendTo(divDataContainer);
						divDataRight.appendTo(divDataContainer);
						divDataContainer.appendTo(divData);

						// DATA Rain 1H and 24H
						let divDataContainerBottom = $("<div/>").addClass("data_container_align");
						let divDCBottom1 = $("<div/>").addClass("data_container");
						let divDCBottom24 = $("<div/>").addClass("data_container");
						let divDataIcon1 = $("<div/>").addClass("data_icon").addClass("small light dimmed").addClass(formatter.icon(NetatmoDataType.SUM_RAIN_1));
						let divDataIcon24 = $("<div/>").addClass("data_icon").addClass("small light dimmed").addClass(formatter.icon(NetatmoDataType.SUM_RAIN_24));
						let divDataLeft1 = $("<div/>").addClass("data_left").addClass("small").append(" " + formatter.value(datatype, value1h));
						let divDataRight1 = $("<div/>").addClass("data_right").append(
							$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(NetatmoDataType.SUM_RAIN_1))
						);
						let divDataLeft24 = $("<div/>").addClass("data_left").addClass("small").append(" " + formatter.value(datatype, value24h));
						let divDataRight24 = $("<div/>").addClass("data_right").append(
							$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(NetatmoDataType.SUM_RAIN_24))
						);
						divDataIcon1.appendTo(divDCBottom1);
						divDataLeft1.appendTo(divDCBottom1);
						divDataRight1.appendTo(divDCBottom1);
						divDataIcon24.appendTo(divDCBottom24);
						divDataLeft24.appendTo(divDCBottom24);
						divDataRight24.appendTo(divDCBottom24);
						divDCBottom1.appendTo(divDataContainerBottom);
						divDCBottom24.appendTo(divDataContainerBottom);
						divDataContainerBottom.appendTo(divData);
						divData.appendTo(result);
						return result;
					},
					displayRainDrops: function (module) {

						let dataType = NetatmoDataType.RAIN;
						let result = $("<div/>").addClass("displayRainDrops");

						$("<div/>").addClass(dataType).append(
							$("<div/>").addClass("xlarge").addClass("wi wi-raindrops")
						).appendTo(result);

						return result;
					},
					// displayRainExtra: function (module) {
					// 	var result = $("<td/>").addClass("displayRainExtra");
					// 	let value1h = this.getValue(module, NetatmoDataType.SUM_RAIN_1, true, false);
					// 	let value24h = this.getValue(module, NetatmoDataType.SUM_RAIN_24, true, false);

					// 	$("<div/>").addClass(NetatmoDataType.SUM_RAIN_1).addClass("small value")
					// 		.append(
					// 			$("<div/>").addClass("wi wi-raindrop")
					// 		).append(
					// 			$("<span/>").append("  Rain_1H: " + formatter.value(NetatmoDataType.SUM_RAIN_1, value1h))
					// 		).appendTo(result);
					// 	$("<div/>").addClass(NetatmoDataType.SUM_RAIN_24).addClass("small value")
					// 		.append(
					// 			$("<div/>").addClass("wi wi-raindrops")
					// 		).append(
					// 			$("<span/>").append("  Rain_24H: " + formatter.value(NetatmoDataType.SUM_RAIN_24, value24h))
					// 		).appendTo(result);

					// 	return result;
					// },

					displayData: function (module, datatype, isDashboardData) {
						Log.log("displayData datatype: " + datatype);
						let displayclass = "display" + datatype;
						Log.log("displayData displayclass: " + displayclass);
						let result = $("<div/>").addClass(displayclass);
						let value = this.getValue(module, datatype, isDashboardData, false);
						let dataIcon = formatter.icon(datatype, value);
						const statusCircle = "fa fa-circle fa-xs"
						let statusClass = "";
						let statusIcon = "";
						let trendIcon = "";
						let valueTrend = "";
						Log.log("displayData value: " + value);
						Log.log("displayData dataIcon: " + dataIcon);
						switch (datatype) {
							case NetatmoDataType.BATTERY:
							case NetatmoDataType.HUMIDITY:
							case NetatmoDataType.NOISE:
							case NetatmoDataType.WIFI:
							case NetatmoDataType.RADIO:
								statusIcon = statusCircle;
								statusClass = formatter.status(datatype, value);
								break;
							case NetatmoDataType.PRESSURE:
								valueTrend = this.getValue(module, NetatmoDataType.PRESSURE_TREND, true, false);
								trendIcon = formatter.icon(NetatmoDataType.PRESSURE_TREND, valueTrend);
								break;
							case NetatmoDataType.TEMPERATURE:
								valueTrend = this.getValue(module, NetatmoDataType.TEMP_TREND, true, false);
								trendIcon = formatter.icon(NetatmoDataType.PRESSURE_TREND, valueTrend);
								break;

							default:
								break;
						}

						Log.log("displayData dataIcon: " + dataIcon);
						Log.log("displayData statusClass: " + statusClass);
						let divData = $("<div/>").addClass(datatype);
						Log.log("displayData divData: " + divData);
						let divDataHeader = $("<div/>").addClass("xxsmall dimmed").append(translator.bind(that)(datatype.toUpperCase()).toUpperCase());
						//let divDataHeader = $("<div/>").addClass("xxsmall dimmed").append(datatype.toUpperCase());
						Log.log("displayData divDataHeader: " + divDataHeader);
						let divDataIcon = $("<div/>").addClass("data_icon").addClass("xsmall light dimmed").addClass(dataIcon);
						//let divDataIcon = $("<div/>").addClass("data_icon").addClass("xsmall light dimmed").addClass(dataIcon);
						Log.log("displayData divDataIcon: " + divDataIcon);
						let divDataContainer = $("<div/>").addClass("data_container");
						Log.log("displayData divDataContainer: " + divDataContainer);
						let divDataLeft = $("<div/>").addClass("data_left").addClass("small light bright").append(formatter.value(datatype, value));
						Log.log("displayData divDataLeft: " + divDataLeft);
						let divDataRight = $("<div/>").addClass("data_right").append(
							$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(datatype))
						);

						Log.log("displayData MIDDLE datatype: " + datatype);
						if (statusIcon !== "") { $("<div/>").addClass("xxsmall light bright").addClass("data_right_down_status").addClass(statusIcon).addClass(statusClass).appendTo(divDataRight); }
						if (trendIcon !== "") { $("<div/>").addClass("xsmall light bright").addClass("data_right_down").addClass(trendIcon).appendTo(divDataRight); }
						if (that.config.showDataIcon) { divDataIcon.appendTo(divDataContainer); }
						if (that.config.showDataHeader) { divDataHeader.appendTo(divData); }
						divDataLeft.appendTo(divDataContainer);
						divDataRight.appendTo(divDataContainer);
						divDataContainer.appendTo(divData);
						divData.appendTo(result);

						Log.log("displayData END datatype: " + datatype);
						return result;
					},

					// displayData2: function (module, dataType) {
					// 	Log.log("displayData dataType: " + dataType);
					// 	let displayclass = "display" + dataType;
					// 	let value = this.getValue(module, dataType, true, false);
					// 	let dataIcon = formatter.icon(dataType);
					// 	let valueTrend = "";

					// 	switch (dataType) {
					// 		case NetatmoDataType.PRESSURE:
					// 			let valueTrend = this.getValue(module, NetatmoDataType.PRESSURE_TREND, true, false);
					// 			break;
					// 		case NetatmoDataType.TEMPERATURE:
					// 			let valueTrend = this.getValue(module, NetatmoDataType.TEMP_TREND, true, false);
					// 			break;
					// 		default:
					// 			break;
					// 	}

					// 	switch (valueTrend) {
					// 		case "up":
					// 			//trendIcon = "fa fa-arrow-up";
					// 			trendIcon = "fa fa-caret-up";
					// 			break;
					// 		case "down":
					// 			//trendIcon = "fa fa-arrow-down";
					// 			trendIcon = "fa fa-caret-down";
					// 			break;
					// 		case "stable":
					// 			//trendIcon = "fa fa-arrow-right";
					// 			trendIcon = "fa fa-caret-right";
					// 			break;
					// 		default:
					// 			trendIcon = "";
					// 			break;
					// 	}

					// 	// if (value >= 40 && value <= 60) {
					// 	// 	status = "";
					// 	// } else if (value < 40 && value > 30 || value < 70 && value > 60) {
					// 	// 	status = "textorange";
					// 	// } else if (value <= 30 || value >= 70) {
					// 	// 	status = "textred";
					// 	// }
					// 	let result = $("<div/>").addClass(displayclass);
					// 	let divData = $("<div/>").addClass(dataType);
					// 	let divDataHeader = $("<div/>").addClass("xxsmall dimmed").append(translator.bind(that)(dataType.toUpperCase()).toUpperCase());
					// 	let divDataIcon = $("<div/>").addClass("data_icon").addClass("xsmall light dimmed").addClass(dataIcon);
					// 	let divDataContainer = $("<div/>").addClass("data_container");
					// 	let divDataLeft = $("<div/>").addClass("data_left").addClass("small light bright").append(formatter.value(dataType, value));
					// 	let divDataRight = $("<div/>").addClass("data_right").append(
					// 		$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(dataType))
					// 	);

					// 	if (trendIcon !== "") { $("<div/>").addClass("xxsmall light bright").addClass("data_right_down").addClass(trendIcon).appendTo(divDataRight) }

					// 	if (that.config.showDataIcon) { divDataIcon.appendTo(divDataContainer); }
					// 	if (that.config.showDataHeader) { divDataHeader.appendTo(divData); }
					// 	divDataLeft.appendTo(divDataContainer);
					// 	divDataRight.appendTo(divDataContainer);
					// 	divDataContainer.appendTo(divData);
					// 	divData.appendTo(result);

					// 	// $("<div/>").addClass(datatype).append(
					// 	// 	$("<div/>").addClass("xxsmall dimmed").append(datatype.toUpperCase())
					// 	// ).append(
					// 	// 	$("<div/>").addClass("data_container").append(
					// 	// 		$("<div/>").addClass("data_icon").addClass("xsmall light dimmed").addClass("wi wi-humidity")
					// 	// 	).append(
					// 	// 		$("<div/>").addClass("data_left").addClass("small light bright").append(formatter.value(datatype, value))
					// 	// 	).append(
					// 	// 		$("<div/>").addClass("data_right").append(
					// 	// 			$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(datatype))
					// 	// 		)
					// 	// 	)
					// 	// ).appendTo(result);

					// 	// $("<div/>").addClass(datatype).append(
					// 	// 	$("<div/>").addClass("data_container").append(
					// 	// 		$("<div/>").addClass("data_left").addClass("small light bright").append(formatter.value(datatype, value))
					// 	// 	).append(
					// 	// 		$("<div/>").addClass("data_right").append(
					// 	// 			$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(datatype))
					// 	// 		)
					// 	// 	).append($("<div/>").addClass("xxsmall light bright").append(datatype))
					// 	// ).appendTo(result);

					// 	// $("<div/>").addClass(datatype).append(
					// 	// 	$("<div/>").addClass("data_container").append(
					// 	// 		$("<div/>").addClass("data_left").addClass("small light bright").append(formatter.value(datatype, value))
					// 	// 	).append(
					// 	// 		$("<div/>").addClass("data_right").append(
					// 	// 			$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(datatype))
					// 	// 		)
					// 	// 	)
					// 	// ).appendTo(result);
					// 	var humword = translator.bind(that)("HUMIDITY", { "procentvalue": value });

					// 	// $("<div/>").addClass(datatype).addClass("small value")
					// 	// 	.append(
					// 	// 		$("<div/>").addClass("wi wi-humidity").addClass(status)
					// 	// 	).append(
					// 	// 		$("<span/>").append(" " + humword + ": " + formatter.value(datatype, value))
					// 	// 	).appendTo(result);
					// 	return result;
					// },

					// displayHumNieuw: function (module) {
					// 	let result = $("<div/>").addClass("displayHum");
					// 	let datatype = NetatmoDataType.HUMIDITY;
					// 	let value = this.getValue(module, datatype, true, false);

					// 	if (value >= 40 && value <= 60) {
					// 		status = "";
					// 	} else if (value < 40 && value > 30 || value < 70 && value > 60) {
					// 		status = "textorange";
					// 	} else if (value <= 30 || value >= 70) {
					// 		status = "textred";
					// 	}

					// 	let divData = $("<div/>").addClass(datatype);
					// 	let divDataHeader = $("<div/>").addClass("xxsmall dimmed").append(translator.bind(that)(datatype.toUpperCase()).toUpperCase());
					// 	let divDataIcon = $("<div/>").addClass("data_icon").addClass("xsmall light dimmed").addClass("wi wi-humidity");
					// 	let divDataContainer = $("<div/>").addClass("data_container");
					// 	let divDataLeft = $("<div/>").addClass("data_left").addClass("small light bright").append(formatter.value(datatype, value));
					// 	let divDataRight = $("<div/>").addClass("data_right").append(
					// 		$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(datatype))
					// 	);

					// 	if (that.config.showDataIcon) { divDataIcon.appendTo(divDataContainer); }
					// 	if (that.config.showDataHeader) { divDataHeader.appendTo(divData); }
					// 	divDataLeft.appendTo(divDataContainer);
					// 	divDataRight.appendTo(divDataContainer);
					// 	divDataContainer.appendTo(divData);
					// 	divData.appendTo(result);

					// 	// $("<div/>").addClass(datatype).append(
					// 	// 	$("<div/>").addClass("xxsmall dimmed").append(datatype.toUpperCase())
					// 	// ).append(
					// 	// 	$("<div/>").addClass("data_container").append(
					// 	// 		$("<div/>").addClass("data_icon").addClass("xsmall light dimmed").addClass("wi wi-humidity")
					// 	// 	).append(
					// 	// 		$("<div/>").addClass("data_left").addClass("small light bright").append(formatter.value(datatype, value))
					// 	// 	).append(
					// 	// 		$("<div/>").addClass("data_right").append(
					// 	// 			$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(datatype))
					// 	// 		)
					// 	// 	)
					// 	// ).appendTo(result);

					// 	// $("<div/>").addClass(datatype).append(
					// 	// 	$("<div/>").addClass("data_container").append(
					// 	// 		$("<div/>").addClass("data_left").addClass("small light bright").append(formatter.value(datatype, value))
					// 	// 	).append(
					// 	// 		$("<div/>").addClass("data_right").append(
					// 	// 			$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(datatype))
					// 	// 		)
					// 	// 	).append($("<div/>").addClass("xxsmall light bright").append(datatype))
					// 	// ).appendTo(result);

					// 	// $("<div/>").addClass(datatype).append(
					// 	// 	$("<div/>").addClass("data_container").append(
					// 	// 		$("<div/>").addClass("data_left").addClass("small light bright").append(formatter.value(datatype, value))
					// 	// 	).append(
					// 	// 		$("<div/>").addClass("data_right").append(
					// 	// 			$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(datatype))
					// 	// 		)
					// 	// 	)
					// 	// ).appendTo(result);
					// 	var humword = translator.bind(that)("HUMIDITY", { "procentvalue": value });

					// 	// $("<div/>").addClass(datatype).addClass("small value")
					// 	// 	.append(
					// 	// 		$("<div/>").addClass("wi wi-humidity").addClass(status)
					// 	// 	).append(
					// 	// 		$("<span/>").append(" " + humword + ": " + formatter.value(datatype, value))
					// 	// 	).appendTo(result);
					// 	return result;
					// },

					// displayPressureNieuw: function (module) {
					// 	let result = $("<div/>").addClass("displayPressure");
					// 	let datatype = NetatmoDataType.PRESSURE;
					// 	let value = this.getValue(module, datatype, true, false);
					// 	let valueTrend = this.getValue(module, NetatmoDataType.PRESSURE_TREND, true, false);
					// 	switch (valueTrend) {
					// 		case "up":
					// 			//trendIcon = "fa fa-arrow-up";
					// 			trendIcon = "fa fa-caret-up";
					// 			break;
					// 		case "down":
					// 			//trendIcon = "fa fa-arrow-down";
					// 			trendIcon = "fa fa-caret-down";
					// 			break;
					// 		case "stable":
					// 			//trendIcon = "fa fa-arrow-right";
					// 			trendIcon = "fa fa-caret-right";
					// 			break;
					// 		default:
					// 			trendIcon = "fa fa-question";
					// 			break;
					// 	}

					// 	let divData = $("<div/>").addClass(datatype);
					// 	let divDataHeader = $("<div/>").addClass("xxsmall dimmed").append(translator.bind(that)(datatype.toUpperCase()).toUpperCase());
					// 	let divDataIcon = $("<div/>").addClass("data_icon").addClass("xsmall light dimmed").addClass("wi wi-humidity");
					// 	let divDataContainer = $("<div/>").addClass("data_container");
					// 	let divDataLeft = $("<div/>").addClass("data_left").addClass("small light bright").append(formatter.value(datatype, value));
					// 	let divDataRight = $("<div/>").addClass("data_right").append(
					// 		$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(datatype))
					// 	).append(
					// 		$("<div/>").addClass("xsmall light bright").addClass("data_right_down").addClass(trendIcon)
					// 	);

					// 	if (that.config.showDataIcon) { divDataIcon.appendTo(divDataContainer); }
					// 	if (that.config.showDataHeader) { divDataHeader.appendTo(divData); }
					// 	divDataLeft.appendTo(divDataContainer);
					// 	divDataRight.appendTo(divDataContainer);
					// 	divDataContainer.appendTo(divData);
					// 	divData.appendTo(result);

					// 	// $("<div/>").addClass(datatype).append(
					// 	// 	$("<div/>").addClass("xxsmall dimmed").append(datatype.toUpperCase())
					// 	// ).append(
					// 	// 	$("<div/>").addClass("data_container").append(
					// 	// 		$("<div/>").addClass("data_left").addClass("small light bright").append(formatter.value(datatype, value))
					// 	// 	).append(
					// 	// 		$("<div/>").addClass("data_right").append(
					// 	// 			$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(datatype))
					// 	// 		).append(
					// 	// 			$("<div/>").addClass("xsmall light bright").addClass("data_right_down").addClass(trendIcon)
					// 	// 		)
					// 	// 	)
					// 	// ).appendTo(result);

					// 	// $("<div/>").addClass(datatype).addClass("small value")
					// 	// 	.append(
					// 	// 		$("<div/>").addClass("wi wi-barometer")
					// 	// 	).append(
					// 	// 		$("<span/>").append("  Pressure: " + formatter.value(datatype, value))
					// 	// 	).appendTo(result);

					// 	return result;
					// },

					// displayNoise: function (module) {
					// 	var result = $("<div/>").addClass("displayNoise");
					// 	let datatype = NetatmoDataType.NOISE;
					// 	let value = this.getValue(module, datatype, true, false);

					// 	let divData = $("<div/>").addClass(datatype);
					// 	let divDataHeader = $("<div/>").addClass("xxsmall dimmed").append(translator.bind(that)(datatype.toUpperCase()).toUpperCase());
					// 	let divDataIcon = $("<div/>").addClass("data_icon").addClass("xsmall light dimmed").addClass("wi wi-humidity");
					// 	let divDataContainer = $("<div/>").addClass("data_container");
					// 	let divDataLeft = $("<div/>").addClass("data_left").addClass("small light bright").append(formatter.value(datatype, value));
					// 	let divDataRight = $("<div/>").addClass("data_right").append(
					// 		$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(datatype))
					// 	).append(
					// 		$("<div/>").addClass("xsmall light bright").addClass("data_right_down").addClass(trendIcon)
					// 	);

					// 	if (that.config.showDataIcon) { divDataIcon.appendTo(divDataContainer); }
					// 	if (that.config.showDataHeader) { divDataHeader.appendTo(divData); }
					// 	divDataLeft.appendTo(divDataContainer);
					// 	divDataRight.appendTo(divDataContainer);
					// 	divDataContainer.appendTo(divData);
					// 	divData.appendTo(result);

					// 	// $("<div/>").addClass(datatype).append(
					// 	// 	$("<div/>").addClass("xxsmall dimmed").append(datatype.toUpperCase())
					// 	// ).append(
					// 	// 	$("<div/>").addClass("data_container").append(
					// 	// 		$("<div/>").addClass("data_left").addClass("small light bright").append(formatter.value(datatype, value))
					// 	// 	).append(
					// 	// 		$("<div/>").addClass("data_right").append(
					// 	// 			$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(formatter.unit(datatype))
					// 	// 		)
					// 	// 	)
					// 	// ).appendTo(result);

					// 	// $("<div/>").addClass(datatype).addClass("small value")
					// 	// 	.append(
					// 	// 		$("<div/>").addClass("wi wi-barometer")
					// 	// 	).append(
					// 	// 		$("<span/>").append("  Pressure: " + formatter.value(datatype, value))
					// 	// 	).appendTo(result);

					// 	return result;
					// },
					// displayMainSecondary: function (module) {
					// 	let result = $("<td/>").addClass("Secondary");
					// 	this.displayCO2(module).appendTo(result);
					// 	this.displayHum(module).appendTo(result);
					// 	this.displayPressure(module).appendTo(result);
					// 	return result;
					// },

					// displayIndoorSecondary: function (module) {
					// 	let result = $("<td/>").addClass("Secondary");
					// 	this.displayCO2(module).appendTo(result);
					// 	this.displayHum(module).appendTo(result);
					// 	return result;
					// },

					// displayOutdoorSecondary: function (module) {
					// 	let result = $("<td/>").addClass("Secondary");
					// 	this.displayAQI(module).appendTo(result);
					// 	this.displayHum(module).appendTo(result);
					// 	return result;
					// },
					// displayRainSecondary: function (module) {
					// 	let result = $("<td/>").addClass("Secondary");
					// 	this.displayRainExtra(module).appendTo(result);
					// 	return result;
					// },

					// displayTemp: function (module) {
					// 	var result = $("<td/>").addClass("displayTemp");
					// 	let datatype = NetatmoDataType.TEMPERATURE;
					// 	let trendIcon = "fa fa-question";
					// 	let value = this.getValue(module, NetatmoDataType.TEMPERATURE, true, false);
					// 	let valueMin = this.getValue(module, NetatmoDataType.TEMP_MIN, true, false);
					// 	let valueMax = this.getValue(module, NetatmoDataType.TEMP_MAX, true, false);
					// 	let valueTrend = this.getValue(module, NetatmoDataType.TEMP_TREND, true, false);

					// 	switch (valueTrend) {
					// 		case "up":
					// 			trendIcon = "fa fa-arrow-up";
					// 			break;
					// 		case "down":
					// 			trendIcon = "fa fa-arrow-down";
					// 			break;
					// 		case "stable":
					// 			trendIcon = "fa fa-arrow-right";
					// 			break;
					// 		default:
					// 			trendIcon = "fa fa-question";
					// 			break;
					// 	}

					// 	$("<div/>").addClass(datatype).append(
					// 		$("<div/>").addClass("x-medium light bright").append(formatter.value(datatype, value))
					// 	).append(
					// 		$("<span/>").addClass("updated xsmall").addClass(trendIcon)
					// 	).append(
					// 		$("<span/>").addClass("small light").append(" " + formatter.value(datatype, valueMin) + " - " + formatter.value(datatype, valueMax))
					// 	)
					// 		.appendTo(result);
					// 	return result;
					// },



					// displayHum: function (module) {
					// 	var result = $("<div/>").addClass("displayHum");
					// 	let datatype = NetatmoDataType.HUMIDITY;
					// 	let value = this.getValue(module, datatype, true, false);

					// 	if (value >= 40 && value <= 60) {
					// 		status = "";
					// 	} else if (value < 40 && value > 30 || value < 70 && value > 60) {
					// 		status = "textorange";
					// 	} else if (value <= 30 || value >= 70) {
					// 		status = "textred";
					// 	}
					// 	var humword = translator.bind(that)("HUMIDITY", { "procentvalue": value });
					// 	$("<div/>").addClass(datatype).addClass("small value")
					// 		.append(
					// 			$("<div/>").addClass("wi wi-humidity").addClass(status)
					// 		).append(
					// 			$("<span/>").append(" " + humword + ": " + formatter.value(datatype, value))
					// 		).appendTo(result);
					// 	return result;
					// },

					// displayCO2: function (module) {

					// 	let dataType = NetatmoDataType.CO2;
					// 	let result = $("<div/>").addClass("displayCO2");
					// 	let value = this.getValue(module, NetatmoDataType.CO2, true, false);
					// 	//let status = value > 2000 ? "bad" : value > 1000 ? "average" : "good";
					// 	let status = value <= 800 ? "good" : value <= 1600 ? "average" : "bad";

					// 	$("<div/>").addClass(dataType).append(
					// 		$("<div/>").addClass("visual small").addClass(status)
					// 	).append(
					// 		$("<div/>").addClass("small value").append("CO² : " + formatter.value("CO2", value))
					// 	).appendTo(result);

					// 	return result;
					// },

					displayAQI: function (module) {
						let result = $("<div/>").addClass("displayAQI");
						var statusAirQuality = isNaN(AirQualityValue) ? "textgray"
							: AirQualityValue < 51 ? "textgreen"
								: AirQualityValue < 101 ? "textyellow"
									: AirQualityValue < 151 ? "textorange"
										: AirQualityValue < 201 ? "textred"
											: AirQualityValue < 301 ? "textpurple"
												: "textdeepred";

						$("<div/>").addClass("AQI").append(
							$("<div/>").addClass("medium light").append(AirQualityImpact)
						).append(
							$("<span/>").addClass("fa fa-leaf").addClass(statusAirQuality)
						).append(
							$("<span/>").addClass("small value").append(" AQI: " + AirQualityValue)
						).appendTo(result);
						return result;
					},

					// displayPressure: function (module) {
					// 	var result = $("<div/>").addClass("displayPressure");
					// 	let datatype = NetatmoDataType.PRESSURE;
					// 	let value = this.getValue(module, datatype, true, false);

					// 	$("<div/>").addClass(datatype).addClass("small value")
					// 		.append(
					// 			$("<div/>").addClass("wi wi-barometer")
					// 		).append(
					// 			$("<span/>").append("  Pressure: " + formatter.value(datatype, value))
					// 		).appendTo(result);

					// 	return result;
					// },

					// displayExtra: function (module) {
					// 	var result = $("<td/>").addClass("displayExtra");
					// 	var valueCO2 = 0;
					// 	switch (module.type) {
					// 		case NetatmoModuleType.MAIN:
					// 			if (module.dashboard_data === undefined) { valueCO2 = 1000; }
					// 			else { valueCO2 = module.dashboard_data["CO2"]; }
					// 			var statusCO2 = valueCO2 > 2000 ? "bad" : valueCO2 > 1000 ? "average" : "good";

					// 			$("<div/>").addClass("").append(
					// 				$("<div/>").addClass("small value").append("CO² : " + formatter.value("CO2", valueCO2))
					// 			).append(
					// 				$("<div/>").addClass("visual small").addClass(statusCO2)
					// 			).append(
					// 				this.displayHum(module)
					// 			).appendTo(result);
					// 			break;

					// 		case NetatmoModuleType.INDOOR:
					// 			var valueCO2 = 0;
					// 			if (module.dashboard_data === undefined) { valueCO2 = 1000; }
					// 			else { valueCO2 = module.dashboard_data["CO2"]; }
					// 			var statusCO2 = valueCO2 > 2000 ? "bad" : valueCO2 > 1000 ? "average" : "good";

					// 			$("<div/>").addClass("").append(
					// 				$("<div/>").addClass("small value").append("CO² : " + formatter.value("CO2", valueCO2))
					// 			).append(
					// 				$("<div/>").addClass("visual small").addClass(statusCO2)
					// 			).appendTo(result);

					// 			break;

					// 		case NetatmoModuleType.OUTDOOR:
					// 			// Display the AirQuality base on Air Quality and Pollution Measurement.
					// 			var statusAirQuality = isNaN(AirQualityValue) ? "textgray"
					// 				: AirQualityValue < 51 ? "textgreen"
					// 					: AirQualityValue < 101 ? "textyellow"
					// 						: AirQualityValue < 151 ? "textorange"
					// 							: AirQualityValue < 201 ? "textred"
					// 								: AirQualityValue < 301 ? "textpurple"
					// 									: "textdeepred";

					// 			$("<div/>").addClass("").append(
					// 				$("<div/>").addClass("medium light").append(AirQualityImpact)
					// 			).append(
					// 				$("<span/>").addClass("fa fa-leaf").addClass(statusAirQuality)
					// 			).append(
					// 				$("<span/>").addClass("small value").append(" AQI: " + AirQualityValue)

					// 			).appendTo(result);

					// 		default:
					// 			break;
					// 	}
					// 	return result;
					// },

					displayInfos: function (module) { //add additional information module at the bottom
						var result = $("<td/>");
						//var valuePressure = 0;
						var valueNoise = 0;
						switch (module.type) {
							case NetatmoModuleType.MAIN: //the main interior module

								var valueWiFi = module.wifi_status;
								if (module.dashboard_data === undefined) {
									//valuePressure = 0;
									valueNoise = 0;
								}
								else {
									//valuePressure = module.dashboard_data["Pressure"];
									valueNoise = module.dashboard_data["Noise"];
								}
								var statusWiFi = valueWiFi < 40 ? "textred" : "";

								//70dB vacuum cleaner. 40dB: library
								var statusNoise = valueNoise > 70 ? "fa fa-volume-up" : valueNoise > 50 ? "fa fa-volume-down" : "fa fa-volume-off";
								var statusNoiseQuality = valueNoise > 70 ? "textred" : valueNoise > 50 ? "textorange" : "";

								// print information
								$("<td/>").append(
									$("<span/>").addClass("fa fa-wifi").addClass(statusWiFi)
								).append(
									$("<span/>").addClass("updated xsmall").append(" WiFi: " + formatter.value("WiFi", valueWiFi) + "  ")
									//).append(
									//	$("<span/>").addClass("fa fa-thermometer-half")
									//).append(
									//	$("<span/>").addClass("updated xsmall").append(" Pressure: " + formatter.value("Pressure", valuePressure) + " ")
								).append(
									$("<span/>").addClass(statusNoise).addClass(statusNoiseQuality)
								).append(
									$("<span/>").addClass("updated xsmall").append(" Noise: " + formatter.value("Noise", valueNoise))
								).append(
									$("<div/>").addClass("line")
								).appendTo(result);

								break;

							case NetatmoModuleType.INDOOR:

								var valueBattery = module.battery_percent;
								var valueRadio = module.rf_status;
								//var valueHum = 0;

								// Set battery and radio status color
								var statusBattery = valueBattery < 30 ? "textred fa fa-battery-1 fa-fw" : valueBattery < 70 ? "fa fa-battery-2 fa-fw" : "fa fa-battery-4 fa-fw";
								var statusRadio = valueRadio < 30 ? "textred" : "";
								//if (module.dashboard_data === undefined) { valueHum = 0; }
								//else { valueHum = module.dashboard_data["Humidity"]; }

								// var statusHum;
								// // Set humidity status color
								// if (valueHum >= 40 && valueHum <= 60) {
								// 	statusHum = "";
								// } else if (valueHum < 40 && valueHum > 30 || valueHum < 70 && valueHum > 60) {
								// 	statusHum = "textorange";
								// } else if (valueHum <= 30 || valueHum >= 70) {
								// 	statusHum = "textred";
								// }

								// print information
								$("<td/>").append(
									$("<span/>").addClass(statusBattery)
								).append(
									$("<span/>").addClass("updated xsmall").append(formatter.value("Battery", valueBattery) + " ")
								).append(
									$("<span/>").addClass("fa fa-signal fa-fw").addClass(statusRadio)
								).append(
									$("<span/>").addClass("updated xsmall").append(" Radio: " + formatter.value("Radio", valueRadio) + " ")
									//).append(
									//$("<span/>").addClass("fa fa-tint").addClass(statusHum)
									//).append(
									//	$("<span/>").addClass("updated xsmall").append(" Humidity: " + formatter.value("Humidity", valueHum))
								).append(
									$("<div/>").addClass("line")
								).appendTo(result);

								break;

							case NetatmoModuleType.OUTDOOR:

								var valueBattery = module.battery_percent;
								var valueRadio = module.rf_status;
								//var valueHum = 0;
								// Set battery and radio status color
								var statusBattery = valueBattery < 30 ? "textred fa fa-battery-1 fa-fw" : valueBattery < 70 ? "fa fa-battery-2 fa-fw" : "fa fa-battery-4 fa-fw";
								var statusRadio = valueRadio < 30 ? "textred" : "";

								// Set humidity status color
								// if (module.dashboard_data === undefined) { valueHum = 0; }
								// else { valueHum = module.dashboard_data["Humidity"]; }

								// var statusHum;

								// if (valueHum >= 40 && valueHum <= 60) {
								// 	statusHum = "";
								// } else if (valueHum < 40 && valueHum > 30 || valueHum < 70 && valueHum > 60) {
								// 	statusHum = "textorange";
								// } else if (valueHum <= 30 || valueHum >= 70) {
								// 	statusHum = "textred";
								// }

								Log.log("RainValue: " + formatter.value("Rain", RainValue));
								if (ModuleMap === undefined) {
									Log.log("Cannot access ModuleMap");
								} else {
									Log.log("ModuleMap size : " + ModuleMap.size);
								}
								if (ModuleMap.get("Rain") === undefined) {
									Log.log("Cannot access ModuleMap.Rain");
								}
								else {
									if (ModuleMap.get("Rain").dashboard_data["Rain"] === undefined) {
										Log.log("Cannot access ModuleMap.Rain Data");
									}
									else {
										let RainValueMap = ModuleMap.get("Rain").dashboard_data["Rain"];
										Log.log("RainValueMap: " + formatter.value("Rain", RainValueMap));
									}
								}

								// print information
								$("<div/>").append(
									$("<span/>").addClass(statusBattery)
								).append(
									$("<span/>").addClass("updated xsmall").append(formatter.value("Battery", valueBattery) + " ")
								).append(
									$("<span/>").addClass("fa fa-signal fa-fw").addClass(statusRadio)
								).append(
									$("<span/>").addClass("updated xsmall").append(" Radio: " + formatter.value("Radio", valueRadio) + " ")
									//).append(
									//	$("<span/>").addClass("fa fa-tint").addClass(statusHum)
									//).append(
									//	$("<span/>").addClass("updated xsmall").append(" Humidity: " + formatter.value("Humidity", valueHum))
								).append(
									$("<div/>").append(
										$("<table/>").append(
											$("<tr/>")
												.append(
													$("<span/>").addClass("wi wi-rain")
												).append(
													$("<span/>").addClass("updated xsmall").append("Rain: " + formatter.value("Rain", RainValue) + " ")
												).append(
													$("<span/>").addClass("wi wi-strong-wind")
												).append(
													$("<span/>").addClass("updated xsmall").append("Wind: " + formatter.value("Wind", WindValue) + " ")
												).append(
													$("<span/>").addClass("updated xsmall").append(formatter.value("WindAngle", WindAngleValue))
												)//finsh tr
										)//finsh table
									)//finsh div
								).append(
									$("<div/>").addClass("line")
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
		}[design];
	},

	getScripts: function () {
		//	      Log.log("Netatmo : getScripts");
		return [
			"aqiFeed.js", //AirQuality
			"String.format.js",
			"//cdnjs.cloudflare.com/ajax/libs/jquery/2.2.2/jquery.js",
			"q.min.js",
			"moment.js"
		];
	},
	getStyles: function () {
		// Log.log("Netatmo : getStyles");
		return ["MMM-netatmo.css", "font-awesome.css", "weather-icons.css"];
	},

	getTranslations: function () {
		//Log.log("Netatmo : getTranslations");
		return {
			cs: "translations/cs.json",
			de: "translations/de.json",
			en: "translations/en.json",
			fr: "translations/fr.json",
			cs: "translations/cs.json",
			nb: "translations/nb.json",
			nl: "translations/nl.json",
			nn: "translations/nn.json"
		};
	},

	getDom: function () {

		Log.log("MMM-Netatmo : getDom");
		var dom = $("<div/>").addClass("MMM-netatmo").addClass(this.config.design);
		if (this.dom) {
			dom.append(
				this.dom
			).append(
				$("<div/>")
					.addClass("updated xsmall")
					.append(moment(new Date(1000 * this.lastUpdate)).fromNow())
			);
			if (!this.config.hideLoadTimer) {
				dom.append($(
					"<svg class=\"loadTimer\" viewbox=\"0 0 250 250\">" +
					"  <path class=\"border\" transform=\"translate(125, 125)\"/>" +
					"  <path class=\"loader\" transform=\"translate(125, 125) scale(.84)\"/>" +
					"</svg>"
				));
			}

		} else {
			dom.append($(
				"<svg class=\"loading\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" preserveAspectRatio=\"xMidYMid\">" +
				"  <circle class=\"outer\"></circle>" +
				"  <circle class=\"inner\">" +
				"    <animate attributeName=\"stroke-dashoffset\" dur=\"5s\" repeatCount=\"indefinite\" from=\"0\" to=\"502\"></animate>" +
				"    <animate attributeName=\"stroke-dasharray\" dur=\"5s\" repeatCount=\"indefinite\" values=\"150.6 100.4;1 250;150.6 100.4\"></animate>" +
				"  </circle>" +
				"</svg>"
			));
		}
		return dom[0];
	}
});
