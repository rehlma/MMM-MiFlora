/* Magic Mirror
 * Module: MMM-MiFlora
 *
 * By Maikel Rehl https://github.com/rehlma
 * MIT Licensed.
 */

Module.register("MMM-MiFlora", {
	// Default module config.
	defaults: {
		units: config.units,
		updateInterval: 30, // in Min
		sendIndoorTemp: false,
		indoorTempSensor: 1,
		sensors: [
			// address: "c4:7c:8d:65:e6:20",
			// name: "Bosai",
			// moistureMin: 20, // in %
			// moistureMax: 60, // in %
			// fertilityMin: 350, // in µS/cm
			// fertilityMax: 2000 // in µS/cm
		]
	},
	connected: false,

	currentData: false,

	start: function() {
		Log.info("Starting module: " + this.name);

		// YOU HAVE TO SEND THIS FIRST INIT MESSAGE!!!!!!
		this.sendSocketNotification("MMM_MIFLORA_START", this.config);
	},

	// Override socket notification handler.
	socketNotificationReceived: function(notification, payload) {
		console.log("socketNotificationReceived " + notification);
		if (notification === "MMM_MIFLORA_CONNECTED") {
			this.connected = payload;
		} else if (notification === "MMM_MIFLORA_DATA") {
			this.currentData = this.prepareData(payload);
			if (this.config.sendIndoorTemp) {
				const indoorTempSensor = this.currentData.length > this.indoorTempSensor ? this.indoorTempSensor : 1;
				var temp = this.currentData[indoorTempSensor - 1].sensorValues.temperature;

				// Check if need Fahrenheit
				if (this.config.units === "imperial") {
					temp = this.c2f(temp);
				}
				this.sendNotification("INDOOR_TEMPERATURE", temp);
			}
		}

		this.updateDom();
	},

	getStyles: function() {
		return ["styles.css"];
	},

	// Select the template depending on the display type.
	getTemplate: function() {
		return "flora_template.njk";
	},

	// Add all the data to the template.
	getTemplateData: function() {
		return {
			sensorData: this.currentData
		};
	},

	prepareData: function(sensorData) {
		var self = this;
		sensorData.forEach(sensor => {
			var match = self.config.sensors.find(best => best.address == sensor.address);
			if (match !== undefined) {
				sensor.name = match.name;
				var values = sensor.sensorValues;
				values.moistureDiff = self.getDiff(values.moisture, match.moistureMin, match.moistureMax);
				values.moistureIcon = self.getIcon(values.moisture, match.moistureMin, match.moistureMax);
				values.fertilityDiff = self.getDiff(values.fertility, match.fertilityMin, match.fertilityMax);
				values.fertilityIcon = self.getIcon(values.fertility, match.fertilityMin, match.fertilityMax);
				sensor.sensorValues = values;
			}
		});
		return sensorData;
	},

	getDiff: function(value, min, max) {
		var range = max - min;
		var bestValue = min + range / 2;
		return Math.round(bestValue - value);
	},

	getIcon: function(value, min, max) {
		if (value < min) {
			return "fa-arrow-up";
		} else if (value > max) {
			return "fa-arrow-down";
		} else {
			return "fa-seedling";
		}
	},

	c2f: function(celsius) {
		return (celsius * 9) / 5 + 32;
	}
});
