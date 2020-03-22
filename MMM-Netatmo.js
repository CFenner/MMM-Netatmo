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
let WindUnit = "kmh";
let Units = "metric";

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
	WIND: "WindStrength",
	WIND_ANGLE: "WindAngle",
	WIND_ANGLE_MAX: "max_wind_angle",
	WIND_STRENGTH: "WindStrength",
	WIND_STRENGTH_MAX: "max_wind_str",
	HEALTH_IDX: "health_idx", //Air Quality Health Index
};

Module.register("MMM-Netatmo", {
	// default config,
	defaults: {
		units: config.units,
		//for AirQuality
		lang: config.language,
		location: "germany/berlin",
		updateIntervalAirQuality: 600, // en secondes = every 30 minutes
		refreshToken: null,
		updatesIntervalDisplay: 60,
		animationSpeed: 1000,
		updatesIntervalDisplayID: 0,
		lastMessageThreshold: 600, // in seconds (10 minutes)
		horizontal: false,
		horizontalOverflow: false,
		windUnit: "kmh", // Possible "KMH", "MPH", "MS", "BFT", "KT"
		displayWindInOutdoor: false,
		displayRainInOutdoor: false,
		showLastMessage: true,
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
		// is useless because called by resume and values of dates have no time to memorize before...
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
					if (Units.toUpperCase() === "IMPERIAL") {
						return this.mm2Inch(value).toFixed(3);
					}
					return value.toFixed(1);
				case NetatmoDataType.GUST_ANGLE:
				case NetatmoDataType.WIND_ANGLE_MAX:
				case NetatmoDataType.WIND_ANGLE:
					return value.toFixed(0);
				case NetatmoDataType.WIND_STRENGTH:
				case NetatmoDataType.GUST_STRENGTH:
				case NetatmoDataType.WIND_STRENGTH_MAX:
					switch (WindUnit.toUpperCase()) {
						case "BFT":
							return this.kmh2Beaufort(value);
						case "MPH":
							return this.kmh2mph(value).toFixed(0);
						case "MS":
							return this.kmh2ms(value).toFixed(1);
						case "KT":
							return this.kmh2kt(value).toFixed(1);
						case "KMH":
						default:
							return value.toFixed(0);
					};
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
				case NetatmoDataType.TEMP_MIN:
				case NetatmoDataType.TEMP_MAX:
					if (Units.toUpperCase() === "IMPERIAL") {
						return this.tempC2F(value).toFixed(1);
					}
					return value.toFixed(1);
				default:
					return value;
			}
		},
		unit: function (dataType) {
			switch (dataType) {
				case NetatmoDataType.CO2:
					return "PPM";
				case NetatmoDataType.NOISE:
					return "DB";
				case NetatmoDataType.HUMIDITY:
				case NetatmoDataType.BATTERY:
				case NetatmoDataType.RADIO:
					return "%";
				case NetatmoDataType.WIFI:
					return "DBM";
				case NetatmoDataType.RAIN:
					if (Units.toUpperCase() === "IMPERIAL") {
						return "INCH";
					}
					return "MM";
				case NetatmoDataType.SUM_RAIN_1:
					return "1H";
				case NetatmoDataType.SUM_RAIN_24:
					return "24H";
				case NetatmoDataType.GUST_STRENGTH:
				case NetatmoDataType.WIND_STRENGTH:
				case NetatmoDataType.WIND_STRENGTH_MAX:
					return WindUnit.toUpperCase();
				case NetatmoDataType.PRESSURE:
					return "MBAR";
				case NetatmoDataType.GUST_ANGLE:
				case NetatmoDataType.WIND_ANGLE:
				case NetatmoDataType.WIND_ANGLE_MAX:
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
				case NetatmoDataType.GUST_STRENGTH:
				case NetatmoDataType.WIND_STRENGTH:
				case NetatmoDataType.WIND_STRENGTH_MAX:
					if (value < 0) { return "wi wi-strong-wind"; }
					let valueBFT = this.kmh2Beaufort(value);
					if (valueBFT >= 0) {
						return "wi wi-wind-beaufort-" + valueBFT;
					}
					return "wi wi-strong-wind";
				case NetatmoDataType.GUST_ANGLE:
				case NetatmoDataType.WIND_ANGLE:
				case NetatmoDataType.WIND_ANGLE_MAX:
					if (value < 0) { return "wi wi-wind from-0-deg"; }
					return "wi wi-wind from-" + value + "-deg";
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
		},
		kmh2ms: function (kmh) {
			// https://www.weather.gov/media/epz/wxcalc/windConversion.pdf
			return 0.277778 * kmh;
		},
		kmh2Beaufort: function (kmh) {
			//http://www.home.hs-karlsruhe.de/~pach0003/informatik_1/aufgaben/en/doc/src-html/de/hska/java/exercises/objects/WindSpeed.html#line.59
			let beaufort = (Math.pow(kmh / 3.01, 0.6666)).toFixed(0);
			if (beaufort > 12) {
				beaufort = 12;
			}

			return beaufort;
		},
		kmh2kt: function (kmh) {
			// https://www.weather.gov/media/epz/wxcalc/windConversion.pdf
			return 0.5399568 * kmh;
		},
		kmh2mph: function (kmh) {
			// https://www.weather.gov/media/epz/wxcalc/windConversion.pdf
			return 0.621371 * kmh;
		},
		tempC2F: function (c) {
			return (1.8 * c) + 32;
		},
		mm2Inch: function (mm) {
			return mm / 25.4;
		},
		// ms2Beaufort: function (ms) {
		// 	// https://stackoverflow.com/questions/60001991/how-to-convert-windspeed-between-beaufort-scale-and-m-s-and-vice-versa-in-javasc
		// 	return Math.ceil(Math.cbrt(Math.pow(ms / 0.836, 2)));
		// },
		deg2Cardinal: function (deg) {
			if (deg > 11.25 && deg <= 33.75) {
				return "NNE";
			} else if (deg > 33.75 && deg <= 56.25) {
				return "NE";
			} else if (deg > 56.25 && deg <= 78.75) {
				return "ENE";
			} else if (deg > 78.75 && deg <= 101.25) {
				return "E";
			} else if (deg > 101.25 && deg <= 123.75) {
				return "ESE";
			} else if (deg > 123.75 && deg <= 146.25) {
				return "SE";
			} else if (deg > 146.25 && deg <= 168.75) {
				return "SSE";
			} else if (deg > 168.75 && deg <= 191.25) {
				return "S";
			} else if (deg > 191.25 && deg <= 213.75) {
				return "SSW";
			} else if (deg > 213.75 && deg <= 236.25) {
				return "SW";
			} else if (deg > 236.25 && deg <= 258.75) {
				return "WSW";
			} else if (deg > 258.75 && deg <= 281.25) {
				return "W";
			} else if (deg > 281.25 && deg <= 303.75) {
				return "WNW";
			} else if (deg > 303.75 && deg <= 326.25) {
				return "NW";
			} else if (deg > 326.25 && deg <= 348.75) {
				return "NNW";
			} else {
				return "N";
			}
		},

	},
	getDesign: function (design) {

		//	Log.log("Netatmo : getDesign");
		var that = this;
		var formatter = this.formatter;
		var translator = this.translate;
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
					getUnit: function (datatype) {
						let unit = formatter.unit(datatype);
						return translator.bind(that)(unit.toUpperCase());
					},
					render: function (device) {
						ModuleMap = new Map();
						if (that.config.NAValue && that.config.moduleOrder.length > 0) { NAValue = that.config.NAValue; }
						if (that.config.windUnit) { WindUnit = that.config.windUnit; }
						if (that.config.units) { Units = that.config.units; }
						var sResult = $("<div/>").addClass("modules").addClass("bubbles");
						if (that.config.horizontal) {
							sResult.addClass("horizontal");
							if (that.config.horizontalOverflow) { sResult.addClass("overflow"); }
						}

						if (that.config.moduleOrder && that.config.moduleOrder.length > 0) {
							for (var moduleName of that.config.moduleOrder) {
								if (device.module_name.toUpperCase() === moduleName.toUpperCase()) {
									Log.log("MMM-Netatmo Device will be mapped: " + device.module_name);
									ModuleMap.set(device.module_name, device);
									ModuleTypeMap.set(device.type, device.module_name);
								} else {
									for (var module of device.modules) {
										if (module.module_name.toUpperCase() === moduleName.toUpperCase()) {
											Log.log("MMM-Netatmo Module will be mapped: " + module.module_name);
											ModuleMap.set(module.module_name, module);
											if (module.type === NetatmoModuleType.INDOOR) {
												let indoor = [];
												if (ModuleTypeMap.has(NetatmoModuleType.INDOOR)) { let indoor = ModuleTypeMap.get(NetatmoModuleType.INDOOR); }
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
							Log.log("MMM-Netatmo Device will be mapped: " + device.module_name);
							ModuleMap.set(device.module_name, device);
							//ModuleTypeMap.set(device.type, device.module_name);
							for (var cnt = 0; cnt < device.modules.length; cnt++) {
								Log.log("MMM-Netatmo Module will be mapped: " + device.modules[cnt].module_name);
								ModuleMap.set(device.modules[cnt].module_name, device.modules[cnt]);
								if (device.modules[cnt].type === NetatmoModuleType.INDOOR) {
									let indoor = [];
									if (ModuleTypeMap.has(NetatmoModuleType.INDOOR)) { let indoor = ModuleTypeMap.get(NetatmoModuleType.INDOOR); }
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
										sResult.append(this.module(module));
										break;

									case NetatmoModuleType.WIND:
										if (!(that.config.displayWindInOutdoor)) {
											sResult.append(this.module(module));
										}
										break;

									case NetatmoModuleType.RAIN:
										if (!(that.config.displayRainInOutdoor)) {
											sResult.append(this.module(module));
										}
										break;
								}
							}
						}
						// Log.log("ModuleTypeMap: " + ModuleTypeMap.size);
						// for (let [key, value] of ModuleTypeMap) {
						// 	Log.log(key + " = " + value);
						// }
						return sResult;
					},
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
						if (!(this.addLastSeen(result, module))) {
							this.addData(module).appendTo(result);
						}
						if (that.config.showModuleStatus) { this.addStatus(module).appendTo(result); }
						$("<div/>").addClass("line").appendTo(result);
						return result[0].outerHTML;
					},
					addPrimary: function (module) {
						//Log.log("MMM-Netatmo addPrimary module: " + module.module_name);
						let result = $("<div/>").addClass("primary");
						switch (module.type) {
							case NetatmoModuleType.MAIN:
							case NetatmoModuleType.INDOOR:
							case NetatmoModuleType.OUTDOOR:
								result.append(this.displayTemp(module));
								break;
							case NetatmoModuleType.RAIN:
								result.append(this.displayRain(module));
								break;
							case NetatmoModuleType.WIND:
								result.append(this.displayWind(module));
								break;
							default:
								break;

						}
						return result;
					},
					addSecondary: function (module) {
						//Log.log("MMM-Netatmo addSecondary module: " + module.module_name);
						let result = $("<div/>").addClass("secondary");
						switch (module.type) {
							case NetatmoModuleType.MAIN:
							case NetatmoModuleType.INDOOR:
								result.append(this.displayCO2(module));
								break;
							case NetatmoModuleType.OUTDOOR:
								result.append(this.displayAQI(module));
								break;
							case NetatmoModuleType.RAIN:
								result.append(this.displayRainDrops(module));
								break;
							case NetatmoModuleType.WIND:
								result.append(this.displayWindAngle(module));
								break;
							default:
								break;

						}
						return result;
					},
					addLastSeen: function (parentresult, module) {
						//Log.log("MMM-Netatmo addLastSeen : " + module.module_name);
						let displayLastSeen = false;
						let lastMessage = this.getValue(module, NetatmoDataType.LAST_MESSAGE, false, false);
						if (lastMessage !== NAValue) {
							let duration = Date.now() / 1000 - lastMessage;
							displayLastSeen = that.config.showLastMessage && duration > that.config.lastMessageThreshold;
						}
						if (displayLastSeen) {
							$("<div/>").addClass("displayLastSeen")
								.addClass("small flash")
								.append(
									translator.bind(that)(NetatmoDataType.LAST_MESSAGE.toUpperCase())
									+ ": "
									+ moment.unix(lastMessage).fromNow()
								)
								.appendTo(parentresult);
						}
						return displayLastSeen;
					},
					addData: function (module) {
						//Log.log("MMM-Netatmo addData module: " + module.module_name);
						let result = $("<div/>").addClass("displayData");
						switch (module.type) {
							case NetatmoModuleType.MAIN:
								this.displayData(module, NetatmoDataType.HUMIDITY, true).appendTo(result);
								this.displayData(module, NetatmoDataType.NOISE, true).appendTo(result);
								this.displayData(module, NetatmoDataType.PRESSURE, true).appendTo(result);
								break;
							case NetatmoModuleType.INDOOR:
								this.displayData(module, NetatmoDataType.HUMIDITY, true).appendTo(result);
								break;
							case NetatmoModuleType.OUTDOOR:
								this.displayData(module, NetatmoDataType.HUMIDITY, true).appendTo(result);
								if (that.config.displayRainInOutdoor && ModuleTypeMap.has(NetatmoModuleType.RAIN)) {
									// Add Raindata to Outdoor
									let moduleName = ModuleTypeMap.get(NetatmoModuleType.RAIN);
									if (ModuleMap.has(moduleName)) {
										let rainModule = ModuleMap.get(moduleName);
										this.displayData(rainModule, NetatmoDataType.RAIN, true).appendTo(result);
									}
								}
								if (that.config.displayWindInOutdoor && ModuleTypeMap.has(NetatmoModuleType.WIND)) {
									// Add winddata to Outdoor
									let moduleName = ModuleTypeMap.get(NetatmoModuleType.WIND);
									if (ModuleMap.has(moduleName)) {
										let rainModule = ModuleMap.get(moduleName);
										this.displayData(rainModule, NetatmoDataType.WIND_STRENGTH, true).appendTo(result);
									}
								}

							case NetatmoModuleType.WIND:
							case NetatmoModuleType.RAIN:
							default:
								break;
						}
						return result;
					},
					addStatus: function (module) {
						let result = $("<div/>").addClass("displayStatus");
						switch (module.type) {
							case NetatmoModuleType.MAIN:
								this.displayData(module, NetatmoDataType.WIFI, false).appendTo(result);
								if (that.config.showModuleFirmware) {
									this.displayData(module, NetatmoDataType.FIRMWARE, false).appendTo(result);
								}
								break;
							case NetatmoModuleType.INDOOR:
							case NetatmoModuleType.OUTDOOR:
							case NetatmoModuleType.RAIN:
							case NetatmoModuleType.WIND:
								this.displayData(module, NetatmoDataType.RADIO, false).appendTo(result);
								this.displayData(module, NetatmoDataType.BATTERY, false).appendTo(result);
								if (that.config.showModuleFirmware) {
									this.displayData(module, NetatmoDataType.FIRMWARE, false).appendTo(result);
								}
							default:
								break;
						}
						return result;
					},
					displayTemp: function (module) {
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
							$("<div/>").addClass("small light bright").addClass("data_right_up").append(this.getUnit(datatype))
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
							$("<div/>").addClass("xxsmall light").addClass("data_right_up").append(this.getUnit(NetatmoDataType.TEMP_MIN))
						);
						let divDataLeftMax = $("<div/>").addClass("data_left").addClass("small").append(" " + formatter.value(datatype, valueMax));
						let divDataRightMax = $("<div/>").addClass("data_right").append(
							$("<div/>").addClass("xxsmall light").addClass("data_right_up").append(this.getUnit(NetatmoDataType.TEMP_MAX))
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

					displayCO2: function (module) {

						let datatype = NetatmoDataType.CO2;
						let result = $("<div/>").addClass("displayCO2");
						let value = this.getValue(module, datatype, true, false);

						$("<div/>").addClass(datatype).append(
							$("<div/>").addClass("small visual").addClass(formatter.status(datatype, value))
						).append(
							$("<div/>").addClass("small value").append(formatter.value(datatype, value) + this.getUnit(datatype))
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
							$("<div/>").addClass("small light bright").addClass("data_right_up").append(this.getUnit(datatype))
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
							$("<div/>").addClass("xxsmall light").addClass("data_right_up").append(this.getUnit(NetatmoDataType.SUM_RAIN_1))
						);
						let divDataLeft24 = $("<div/>").addClass("data_left").addClass("small").append(" " + formatter.value(datatype, value24h));
						let divDataRight24 = $("<div/>").addClass("data_right").append(
							$("<div/>").addClass("xxsmall light").addClass("data_right_up").append(this.getUnit(NetatmoDataType.SUM_RAIN_24))
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

						let datatype = NetatmoDataType.RAIN;
						let result = $("<div/>").addClass("displayRainDrops");

						$("<div/>").addClass(datatype).append(
							$("<div/>").addClass("xlarge").addClass("wi wi-raindrops")
						).appendTo(result);

						return result;
					},
					displayWind: function (module) {
						var result = $("<div/>").addClass("displayWind");
						let datatype = NetatmoDataType.WIND_STRENGTH;
						let value = this.getValue(module, datatype, true, false);
						let valueGustAngle = this.getValue(module, NetatmoDataType.GUST_ANGLE, true, false);
						let valueGustStrength = this.getValue(module, NetatmoDataType.GUST_STRENGTH, true, false);
						let valueMaxAngle = this.getValue(module, NetatmoDataType.WIND_ANGLE_MAX, true, false);
						let valueMaxStrength = this.getValue(module, NetatmoDataType.WIND_STRENGTH_MAX, true, false);

						// MAIN Data
						let divData = $("<div/>").addClass(datatype);
						let divDataContainer = $("<div/>").addClass("data_container");
						let divDataLeft = $("<div/>").addClass("data_left").addClass("large light bright").append(formatter.value(datatype, value));
						let divDataRight = $("<div/>").addClass("data_right").append(
							$("<div/>").addClass("small light bright").addClass("data_right_up").append(this.getUnit(datatype))
						).append(
							$("<div/>").addClass("medium light bright").addClass("data_right_down").addClass(formatter.icon(NetatmoDataType.WIND_STRENGTH, value))
						);

						divDataLeft.appendTo(divDataContainer);
						divDataRight.appendTo(divDataContainer);
						divDataContainer.appendTo(divData);

						// DATA GUST and MAX
						let divDataContainerBottom = $("<div/>").addClass("data_container_align");
						let divDCBottomGust = $("<div/>").addClass("data_container");
						let divDCBottomMax = $("<div/>").addClass("data_container");
						let divDataIconGust = $("<div/>").addClass("data_icon").addClass("small light dimmed").addClass(formatter.icon(NetatmoDataType.GUST_ANGLE, valueGustAngle));
						let divDataIconMax = $("<div/>").addClass("data_icon").addClass("small light dimmed").addClass(formatter.icon(NetatmoDataType.WIND_ANGLE_MAX, valueMaxAngle));
						let divDataLeftGust = $("<div/>").addClass("data_left").addClass("small").append(" " + formatter.value(NetatmoDataType.GUST_STRENGTH, valueGustStrength));
						let divDataRightGust = $("<div/>").addClass("data_right").append(
							$("<div/>").addClass("small light").addClass("data_right_up").addClass(formatter.icon(NetatmoDataType.GUST_STRENGTH, valueGustStrength))
						);
						let divDataLeftMax = $("<div/>").addClass("data_left").addClass("small").append(" " + formatter.value(NetatmoDataType.WIND_STRENGTH_MAX, valueMaxStrength));
						let divDataRightMax = $("<div/>").addClass("data_right").append(
							$("<div/>").addClass("small light").addClass("data_right_up").addClass(formatter.icon(NetatmoDataType.WIND_STRENGTH_MAX, valueMaxStrength))
						);
						divDataIconGust.appendTo(divDCBottomGust);
						divDataLeftGust.appendTo(divDCBottomGust);
						divDataRightGust.appendTo(divDCBottomGust);
						divDataIconMax.appendTo(divDCBottomMax);
						divDataLeftMax.appendTo(divDCBottomMax);
						divDataRightMax.appendTo(divDCBottomMax);
						divDCBottomGust.appendTo(divDataContainerBottom);
						divDCBottomMax.appendTo(divDataContainerBottom);
						divDataContainerBottom.appendTo(divData);
						divData.appendTo(result);
						return result;
					},
					displayWindAngle: function (module) {
						var result = $("<div/>").addClass("displayWindAngle");
						let datatype = NetatmoDataType.WIND_ANGLE;
						let value = this.getValue(module, datatype, true, false);
						let icon = formatter.icon(datatype, value);

						$("<div/>").addClass(datatype).append(
							$("<div/>").addClass("x-medium").addClass(icon)
						).append(
							$("<div/>").addClass("small value").append(translator.bind(that)(formatter.deg2Cardinal(value).toUpperCase()) + " | " + value + this.getUnit(datatype))
						).appendTo(result);
						return result;
					},
					displayData: function (module, datatype, isDashboardData) {
						let displayclass = "display" + datatype;
						let result = $("<div/>").addClass(displayclass);
						let value = this.getValue(module, datatype, isDashboardData, false);
						let dataIcon = formatter.icon(datatype, value);
						const statusCircle = "fa fa-circle fa-xs";
						let statusClass = "";
						let statusIcon = "";
						let trendIcon = "";
						let valueTrend = "";

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
							case NetatmoDataType.WIND_STRENGTH:
								let valueAngle = this.getValue(module, NetatmoDataType.WIND_ANGLE, true, false);
								dataIcon = formatter.icon(NetatmoDataType.WIND_ANGLE, valueAngle);
							default:
								break;
						}

						let divData = $("<div/>").addClass(datatype);
						let divDataHeader = $("<div/>").addClass("xxsmall dimmed").append(translator.bind(that)(datatype.toUpperCase()).toUpperCase());
						let divDataIcon = $("<div/>").addClass("data_icon").addClass("xsmall light dimmed").addClass(dataIcon);
						let divDataContainer = $("<div/>").addClass("data_container");
						let divDataLeft = $("<div/>").addClass("data_left").addClass("small light bright").append(formatter.value(datatype, value));
						let divDataRight = $("<div/>").addClass("data_right").append(
							$("<div/>").addClass("xxsmall light bright").addClass("data_right_up").append(this.getUnit(datatype))
						);

						if (statusIcon !== "") { $("<div/>").addClass("xxsmall light bright").addClass("data_right_down_status").addClass(statusIcon).addClass(statusClass).appendTo(divDataRight); }
						if (trendIcon !== "") { $("<div/>").addClass("xsmall light bright").addClass("data_right_down").addClass(trendIcon).appendTo(divDataRight); }
						if (that.config.showDataIcon) { divDataIcon.appendTo(divDataContainer); }
						if (that.config.showDataHeader) { divDataHeader.appendTo(divData); }
						divDataLeft.appendTo(divDataContainer);
						divDataRight.appendTo(divDataContainer);
						divDataContainer.appendTo(divData);
						divData.appendTo(result);

						return result;
					},
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
		return ["MMM-netatmo.css", "font-awesome.css", "weather-icons.css", "weather-icons-wind.css"];
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
