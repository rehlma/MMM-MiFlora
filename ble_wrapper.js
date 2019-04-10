/* Magic Mirror
 * Module: MMM-MiFlora
 *
 * By Maikel Rehl https://github.com/rehlma
 * MIT Licensed.
 */

/**
 * Available Arguments
 * --duration=30 Discovery duration in sec
 * --interval=30 Sensordata update interval in min
 * --address=c4:7c:8d:65:e7:22 Mac adress of the sensor. You can use it multiple times
 * --address=c4:7c:8d:65:e7:23 Mac adress of the sensor. You can use it multiple times
 */

var miflora = require("./lib/miflora.js");

// Getting arguments
var args = require("minimist")(process.argv.slice(2));
var isConnected = false;
var connectedSensors = [];

const conf = {
	interval: args.interval || 30 * 60 * 1000
};

const floraConf = {
	duration: args.duration * 1000 || 60 * 1000,
	addresses: setAdresses(),
	ignoreUnknown: setAdresses().length !== 0
};

function setAdresses() {
	if (Array.isArray(args.address)) {
		return args.address;
	} else if (args.address) {
		return [args.address];
	} else {
		return [];
	}
}

function initConnection() {
	console.log("Start discovery for " + floraConf.addresses);
	isConnected = false;
	connectedSensors = [];

	miflora.discover(floraConf).then(devices => {
		console.log("Found " + devices.length + " devices");

		if (devices.length == 0) {
			console.log("Retry");
			initConnection();
		}

		devices.forEach(device => {
			console.log(device.name + " [" + device.address + "]");
			connect(device);
		});
	});
}

function connect(device) {
	device
		.connect()
		.then(_ => {
			console.log("Connected");
			connectedSensors.push(device);
		})
		.then(_ => {
			console.log("All devices connected");
			isConnected = true;
			// Initial data
			publishData();
		})
		.catch(reason => {
			console.log(reason);
			console.log("Retry after 3 sec");
			setTimeout(() => {
				connect(device);
			}, 3000);
		});
}

// returns a Promise
function getData() {
	if (!isConnected) {
		return;
	}

	var collect = [];

	connectedSensors.forEach(sensor => {
		collect.push(sensor.query());
	});

	return Promise.all(collect);
}

function publishData() {
	if (!isConnected) {
		return;
	}
	getData()
		.then(data => {
			process.stdout.write(JSON.stringify(data));
		})
		.catch(reason => {
			console.log(reason);
		});
}

(function() {
	// Connect devices
	initConnection();

	setInterval(function() {
		publishData();
	}, conf.interval * 60 * 1000);
})();
