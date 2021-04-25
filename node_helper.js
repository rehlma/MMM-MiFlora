/* Magic Mirror
 * Node Helper: MMM-MiFlora
 *
 * By Maikel Rehl https://github.com/rehlma
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");
const { spawn } = require("child_process");

module.exports = NodeHelper.create({
	// Override start method.
	start: function () {
		this.sendSocketNotification("init");

		console.log("Starting node helper for: " + this.name);
	},

	// Override socketNotificationReceived method.
	socketNotificationReceived: function (notification, payload) {
		console.log("socketNotificationReceived node_helper " + notification);
		if (notification === "MMM_MIFLORA_START") {
			const args = ["./modules/MMM-MiFlora/ble_wrapper.js", "--duration=60", "--interval=" + payload.updateInterval];
			payload.sensors.forEach((sensor) => {
				args.push("--address=" + sensor.address);
			});

			const flora = spawn("node", args);

			// Start connection and stream
			this.startStream(flora);
		}
	},

	startStream: function (flora) {
		var self = this;

		flora.stdout.on("data", (stream) => {
			var data = String(stream);
			console.log(data);

			// If stdout is a string array, it contains the data
			if (data.startsWith("[") && data.endsWith("]")) {
				var json = JSON.parse(data);
				self.sendSocketNotification("MMM_MIFLORA_DATA", json);
			}
		});

		// since these are streams, you can pipe them elsewhere
		flora.stderr.on("data", (err) => {
			console.error(`exec error: ${err}`);
			return;
		});
	}
});
