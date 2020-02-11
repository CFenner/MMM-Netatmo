/* Magic Mirror
 * Module: Netatmo
 *
 * By Christopher Fenner http://github.com/CFenner
 * MIT Licensed.
 */
/* global $, Q, moment, Module, Log */
Module.register("MMM-Netatmo", {
	// default config,
	defaults: {
		refreshToken: null,
		updateInterval: 3, // every 3 minutes, refresh interval on netatmo is 10 minutes
		animationSpeed: 1000,
		design: "classic", //bubbles
		hideLoadTimer: false,
		horizontal: true,
		lastMessageThreshold: 600, // in seconds (10 minutes)
		showLastMessage: true,
		showBattery: true,
		showRadio: true,
		showWiFi: true,
		showTrend: true,
		showReachable: true,
		notPresentValue: "--",
		api: {
			base: "https://api.netatmo.com/",
			authEndpoint: "oauth2/token",
			authPayload: "grant_type=refresh_token&refresh_token={0}&client_id={1}&client_secret={2}",
			dataEndpoint: "api/getstationsdata",
			dataPayload: "access_token={0}"
		},
		notPresentValue: "--",
	},
	// init method
	start: function () {
		Log.info("Starting module: " + this.name);
		this.α = 0;
		// set interval for reload timer
		this.t = this.config.updateInterval * 60 * 1000 / 360;
		// run timer
		this.updateLoad();
	},
	updateLoad: function () {
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
	updateWait: function () {
		this.α++;
		this.α %= 360;
		var r = (this.α * Math.PI / 180);
		var x = Math.sin(r) * 125;
		var y = Math.cos(r) * -125;
		var mid = (this.α > 180) ? 1 : 0;
		var anim = "M 0 0 v -125 A 125 125 1 " +
			mid + " 1 " +
			x + " " +
			y + " z";

		var loader = $(".netatmo .loadTimer .loader");
		if (loader.length > 0) {
			loader.attr("d", anim);
		}
		var border = $(".netatmo .loadTimer .border");
		if (border.length > 0) {
			border.attr("d", anim);
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
		token: function () {
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
			// Log.info(this.name + " token loaded "+data.access_token);
			this.config.refreshToken = data.refresh_token;
			// call for station data
			return Q($.ajax({
				url: this.config.api.base + this.config.api.dataEndpoint,
				data: this.config.api.dataPayload.format(data.access_token)
			}));
		}
	},
	renderAll: function (data) {
		var device = data.body.devices[0];
		this.lastUpdate = device.dashboard_data.time_utc;
		// render modules
		this.dom = this.getDesign(this.config.design).render(device);
		this.updateDom(this.config.animationSpeed);
		return Q({});
	},
	renderError: function (reason) {
		/* eslint-disable no-console */
		console.log("error " + reason);
		/* eslint-enable no-console */
		//  enable display of error messages
		/*
    $(netatmo.location).updateWithText(
      "could not load data: "+reason.responseJSON.error,
      this.config.fadeInterval
    );
    */
	},
	formatter: {
		notPresentValue: "--",
		value: function (dataType, value) {
			var translator = this.translate;
			if (typeof value === "undefined" || value === this.notPresentValue) {
				return value;
			}
			switch (dataType) {
				case "CO2":
					return value.toFixed(0) + " ppm";
				case "Noise":
					return value.toFixed(0) + " dB";
				case "Humidity":
				case "Battery":
				case "WiFi":
				case "Radio":
					return value.toFixed(0) + "%";
				case "Pressure":
					return value.toFixed(0) + " mbar";
				case "Temperature":
					return value.toFixed(1) + "°";
				case "Rain":
					return value.toFixed(1) + " mm/h";
				case "sum_rain_24":
				case "sum_rain_1":
					return value.toFixed(1) + " mm";
				case "WindStrength":
				case "GustStrength":
					return value.toFixed(0) + " m/s";
				case "WindAngle":
				case "GustAngle":
					return this.direction(value) + " | " + value + "°";
				case "Reachable":
					return value.toString();
				case "NotPresent":
					return this.notPresentValue;
				default:
					return value;
			}
		},
		direction: function (value) {
			if (value < 11.25) { return "N"; }
			if (value < 33.75) { return "NNE"; }
			if (value < 56.25) { return "NE"; }
			if (value < 78.75) { return "ENE"; }
			if (value < 101.25) { return "E"; }
			if (value < 123.75) { return "ESE"; }
			if (value < 146.25) { return "SE"; }
			if (value < 168.75) { return "SSE"; }
			if (value < 191.25) { return "S"; }
			if (value < 213.75) { return "SSW"; }
			if (value < 236.25) { return "SW"; }
			if (value < 258.75) { return "WSW"; }
			if (value < 281.25) { return "W"; }
			if (value < 303.75) { return "WNW"; }
			if (value < 326.25) { return "NW"; }
			if (value < 348.75) { return "NNW"; }
			return "N";
		},
		rain: function () {
			return "";
		}
	},
	getDesign: function (design) {
		var that = this;
		var formatter = this.formatter;
		var translator = this.translate;
		return {
			classic: (function (formatter, translator, that) {
				return {
					render: function (device) {
						var sResult = $("<div/>").addClass("modules").addClass(that.config.design);
						if (that.config.horizontal) { sResult.addClass("horizontal"); }
						var aOrderedModuleList = that.config.moduleOrder && that.config.moduleOrder.length > 0 ?
							that.config.moduleOrder :
							null;
						if (aOrderedModuleList) {
							for (var moduleName of aOrderedModuleList) {
								if (device.module_name.toUpperCase() === moduleName.toUpperCase()) {
									sResult.append(this.renderModule(device));
								} else {
									for (var module of device.modules) {
										if (module.module_name.toUpperCase() === moduleName.toUpperCase()) {
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
					renderModule: function (oModule) {
						return $("<div/>").addClass("module").append(
							$("<div>").addClass("data").append(this.renderSensorData(oModule))
						).append(
							$("<div>").addClass("name small").append(oModule.module_name)
						);
					},
					renderSensorData: function (oModule) {
						var sResult = $("<table/>");
						var aDataTypeList = that.config.dataOrder && that.config.dataOrder.length > 0 ?
							that.config.dataOrder :
							oModule.data_type;
						for (var dataType of aDataTypeList) {
							if ($.inArray(dataType, oModule.data_type) > -1) {
								let value = typeof oModule.dashboard_data !== "undefined" ? oModule.dashboard_data[dataType] : that.config.notPresentValue;
								sResult.append(
									this.renderData(
										dataType,
										value)
								);
							}
						}
						if (that.config.showBattery && typeof oModule.battery_percent !== "undefined") {
							sResult.append(this.renderData("Battery", oModule.battery_percent));
						}
						if (that.config.showReachable && typeof oModule.showReachable !== "undefined") {
							sResult.append(this.renderData("Reachable", oModule.showReachable));
						}
						return sResult;
					},
					renderData: function (dataType, value) {
						return $("<tr/>").append(
							$("<td/>").addClass("small").append(
								translator.bind(that)(dataType.toUpperCase())
							)
						).append(
							$("<td/>").addClass("small value").append(
								formatter.value(dataType, value)
							)
						);
					}
				};
			})(formatter, translator, that),
			bubbles: (function (formatter, translator, that) {
				return {
					moduleType: {
						MAIN: "NAMain",
						INDOOR: "NAModule4",
						OUTDOOR: "NAModule1",
						RAIN: "NAModule3",
						WIND: "NAModule2"
					},
					render: function (device) {
						var sResult = $("<div/>").addClass("modules").addClass(that.config.design);
						var aOrderedModuleList = that.config.moduleOrder && that.config.moduleOrder.length > 0 ?
							that.config.moduleOrder :
							null;

						if (aOrderedModuleList) {
							for (var moduleName of aOrderedModuleList) {
								if (device.module_name.toUpperCase() === moduleName.toUpperCase()) {
									sResult.append(this.module(device));
								} else {
									for (var module of device.modules) {
										if (module.module_name.toUpperCase() === moduleName.toUpperCase()) {
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
					module: function (module) {
						var result = $("<div/>").addClass("module").append(
							$("<div/>").addClass("name small").append(module.module_name)
						).append(
							$("<div/>").append(
								$("<table/>").addClass("").append(
									$("<tr/>").append(
										this.primary(module)
									).append(
										this.secondary(module)
									).append(
										this.data(module)
									)))
						);
						return result[0].outerHTML;
					},
					primary: function (module) {
						let result = $("<td/>").addClass("primary");
						let type = typeof module.dashboard_data === "undefined" ? "NotPresent" : "";
						let value = that.config.notPresentValue;
						switch (module.type) {
							case this.moduleType.MAIN:
							case this.moduleType.INDOOR:
							case this.moduleType.OUTDOOR:
								if (type !== "NotPresent") {
									type = "Temperature";
									value = module.dashboard_data[type];
								}
								$("<div/>").addClass(type).append(
									$("<div/>").addClass("large light bright").append(formatter.value(type, value))
								).append($("<div/>").addClass("secondary CO2").append(
									$("<div/>").addClass("visual").addClass("average")
								)).appendTo(result);
								break;
							case this.moduleType.WIND:
								if (type !== "NotPresent") {
									type = "WindStrength";
									value = module.dashboard_data[type];
								}
								$("<div/>").addClass(type).append(
									$("<div/>").addClass("large light bright").append(value)
								).append(
									$("<div/>").addClass("xsmall").append("m/s")
								).appendTo(result);
								break;
							case this.moduleType.RAIN:
								if (type !== "NotPresent") {
									type = "Rain";
									value = module.dashboard_data[type];
								}
								$("<div/>").addClass(type).append(
									$("<div/>").addClass("large light bright").append(value)
								).append(
									$("<div/>").addClass("xsmall").append("mm/h <i class='up></i>")
								).appendTo(result);
								break;
							default:
						}
						return result;
					},
					secondary: function (module) {
						let result = $("<td/>").addClass("secondary");
						let type = typeof module.dashboard_data === "undefined" ? "NotPresent" : "";
						let value = that.config.notPresentValue;
						switch (module.type) {
							case this.moduleType.MAIN:
							case this.moduleType.INDOOR:
								if (type !== "NotPresent") {
									type = "CO2";
									value = module.dashboard_data[type];
									let status = value <= 800 ? "good" : value <= 1600 ? "average" : "bad";

									$("<div/>").addClass(type).append(
										$("<div/>").addClass("visual").addClass(status)
									).append($("<div/>").addClass("CO2").append(
										$("<div/>").addClass("visual").addClass("average")
									)).append(
										$("<div/>").addClass("small value").append(formatter.value(type, value))
									).append(
										$("<div/>").append("<p>Up arrow: <i class='up'></i></p>")
									).appendTo(result);
								}
								break;
							case this.moduleType.WIND:
								if (type !== "NotPresent") {
									type = "WindAngle";
									value = module.dashboard_data[type];

									$("<div/>").addClass(type).append(
										$("<div/>").addClass("visual xlarge wi wi-direction-up").css("transform", "rotate(" + value + "deg)")
									).append(
										$("<div/>").addClass("small value").append(formatter.value(type, value))
									).appendTo(result);
								}
								break;
							case this.moduleType.OUTDOOR:
							case this.moduleType.RAIN:
							default:
								break;
						}
						return result;
					},
					data: function (module) {
						var result = $("<td/>").addClass("data");
						switch (module.type) {
							case this.moduleType.MAIN:
								this.addTemperatureTrend(result, module);
								this.addHumidity(result, module);
								this.addPressure(result, module);
								this.addPressureTrend(result, module);
								this.addNoise(result, module);
								this.addWiFi(result, module);
								//result += this.addData('max_temp', module.dashboard_data['max_temp']);
								//result += this.addData('min_temp', module.dashboard_data['min_temp']);
								break;
							case this.moduleType.INDOOR:
								this.addTemperatureTrend(result, module);
								this.addHumidity(result, module);
								this.addBattery(result, module);
								this.addRadio(result, module);
								this.addLastSeen(result, module);
								break;
							case this.moduleType.OUTDOOR:
								this.addTemperatureTrend(result, module);
								this.addHumidity(result, module);
								this.addBattery(result, module);
								this.addRadio(result, module);
								this.addLastSeen(result, module);
								break;
							case this.moduleType.WIND:
								this.addGustStrength(result, module);
								this.addGustAngle(result, module);
								this.addBattery(result, module);
								this.addRadio(result, module);
								this.addLastSeen(result, module);
								break;
							case this.moduleType.RAIN:
								this.addSumRain1(result, module);
								this.addSumRain24(result, module);
								this.addBattery(result, module);
								this.addRadio(result, module);
								this.addLastSeen(result, module);
								break;
							default:
								break;
						}
						return result;
					},
					getValue: function (module, datatype, isDashboardData, translate) {
						let value;
						if (isDashboardData) {
							value = typeof module.dashboard_data !== "undefined" ? (module.dashboard_data[datatype]) : that.config.notPresentValue;
						}
						else {
							value = typeof module[datatype] !== "undefined" ? (module[datatype]) : that.config.notPresentValue;
						}
						return value = (translate) ? translator.bind(that)(value.toUpperCase()) : value;
					},
					addTemperatureTrend: function (parent, module) {
						if (that.config.showTrend) {
							let datatype = "temp_trend";
							let value = this.getValue(module, datatype, true, true);
							this.addData(parent, datatype, value);
						}
					},
					addPressure: function (parent, module) {
						let datatype = "Pressure";
						let value = this.getValue(module, datatype, true, false);
						return this.addData(parent, datatype, value);
					},
					addPressureTrend: function (parent, module) {
						if (that.config.showTrend) {
							let datatype = "pressure_trend";
							let value = this.getValue(module, datatype, true, true);
							this.addData(parent, datatype, value);
						}
					},
					addHumidity: function (parent, module) {
						let datatype = "Humidity";
						let value = this.getValue(module, datatype, true, false);
						return this.addData(parent, datatype, value);
					},
					addNoise: function (parent, module) {
						let datatype = "Noise";
						let value = this.getValue(module, datatype, true, false);
						return this.addData(parent, datatype, value);
					},
					addGustStrength: function (parent, module) {
						let datatype = "GustStrength";
						let value = this.getValue(module, datatype, true, false);
						return this.addData(parent, datatype, value);
					},
					addGustAngle: function (parent, module) {
						let datatype = "GustAngle";
						let value = this.getValue(module, datatype, true, false);
						return this.addData(parent, datatype, value);
					},
					addSumRain1: function (parent, module) {
						let datatype = "sum_rain_1";
						let value = this.getValue(module, datatype, true, false);
						return this.addData(parent, datatype, value);
					},
					addSumRain24: function (parent, module) {
						let datatype = "sum_rain_24";
						let value = this.getValue(module, datatype, true, false);
						return this.addData(parent, datatype, value);
					},
					addBattery: function (parent, module) {
						if (that.config.showBattery) {
							let datatype = "Battery";
							let value = this.getValue(module, "battery_percent", false, false);
							this.addData(parent, datatype, value);
						}
					},
					addRadio: function (parent, module) {
						if (that.config.showRadio) {
							let datatype = "Radio";
							let value = this.getValue(module, "rf_status", false, false);
							this.addData(parent, datatype, value);
						}
					},
					addWiFi: function (parent, module) {
						if (that.config.showWiFi) {
							let datatype = "WiFi";
							let value = this.getValue(module, "wifi_status", false, false);
							this.addData(parent, datatype, value);
						}
					},
					addLastSeen: function (parent, module) {
						var duration = Date.now() / 1000 - module.last_message;
						if (that.config.showLastMessage && duration > that.config.lastMessageThreshold) {
							$("<div/>")
								.addClass("small flash")
								.append(
									translator.bind(that)("LAST_MESSAGE")
									+ ": "
									+ moment.unix(module.last_message).fromNow()
								)
								.appendTo(parent);
						}
					},
					addData: function (parent, type, value) {
						return $("<div/>")
							.addClass("small")
							.append(
								translator.bind(that)(type.toUpperCase())
								+ ": "
								+ formatter.value(type, value) + ":: " + "&#10514;"
							)
							.append($("<i/>").addClass("up"))
							.appendTo(parent);
					}
				};
			})(formatter, translator, that)
		}[design];
	},
	getScripts: function () {
		return [
			"String.format.js",
			"//cdnjs.cloudflare.com/ajax/libs/jquery/2.2.2/jquery.js",
			"q.min.js",
			"moment.js"
		];
	},
	getStyles: function () {
		return [
			"netatmo.css"
		];
	},
	getTranslations: function () {
		return {
			en: "l10n/en.json",
			de: "l10n/de.json",
			fr: "l10n/fr.json",
			cs: "l10n/cs.json",
			nb: "l10n/nb.json",
			nl: "l10n/nl.json",
			nn: "l10n/nn.json"
		};
	},
	getDom: function () {
		var dom = $("<div/>").addClass("netatmo");
		if (this.dom) {
			dom.append(
				this.dom
			).append(
				$("<div/>")
					.addClass("updated xsmall")
					.append(moment.unix(this.lastUpdate).fromNow())
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
