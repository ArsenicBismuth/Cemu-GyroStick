module.exports = async function(arg) {
	await require(arg.__rootDir + '/core/setup.js')(arg);
	log('version: ' + pkg.version);

	const gyroServer = require('./gyroServer.js');
	const {
		Mouse,
		Keyboard,
		Gamepad,
		or,
		and
	} = require('./contro.js');
	let gamepad = new Gamepad();

	const http = require("http");
	const WebSocket = require("ws");

	let btnNames = [
		'lt', 'rt'
	];
	let btns = {};
	for (let i of btnNames) {
		btns[i] = gamepad.button(i);
	}
	let btnStates = {};
	let speedShift = true;
	let gyaxises = ['x', 'y', 'z'];
	let acaxises = ['x', 'y', 'z'];
	let invert = {
		x: 1,
		y: 1,
		z: 1
	};
	let gamepadConnected = false;
	let inNuetralPos = {
		x: true,
		y: true,
		z: true
	};
	let stickDeadZone = 0.0;
    
    // Gyro conversion: float (+-1) => *16b (+-32767) unit => * 250/32767 deg/sec
	let gySens = -1.0 * 250;
    // Accel conversion: float (+-1) => *16b (+-32767) unit => * 2g/32767 m/s2
	let acSens = -1.0 * 2 * 9.8;

	let files = await klaw(path.join(__rootDir, '/views/md'));
	for (let file of files) {
		let html = await fs.readFile(file, 'utf8');
		html = '<div class="md">' + md(html) + '</div>';
		file = path.parse(file);
		$('#' + file.name).prepend(html);
	}
	$(document).on('click', 'a[href^="http"]', function(event) {
		event.preventDefault();
		opn(this.href);
	});

	function toggleAxis() {
		let $btn = $(this);
		$btn.toggleClass('enabled');
		gyaxises = [];
		acaxises = [];
		if ($('#gyroX').hasClass('enabled')) {
			gyaxises.push('x');
		}
		if ($('#gyroY').hasClass('enabled')) {
			gyaxises.push('y');
		}
		if ($('#gyroZ').hasClass('enabled')) {
			gyaxises.push('z');
		}
        if ($('#accelX').hasClass('enabled')) {
			acaxises.push('x');
		}
		if ($('#accelY').hasClass('enabled')) {
			acaxises.push('y');
		}
		if ($('#accelZ').hasClass('enabled')) {
			acaxises.push('z');
		}
	}
	$('#gyroX').click(toggleAxis);
	$('#gyroY').click(toggleAxis);
	$('#gyroZ').click(toggleAxis);
	$('#accelX').click(toggleAxis);
	$('#accelY').click(toggleAxis);
	$('#accelZ').click(toggleAxis);

	function toggleControls() {
		let $btn = $(this);
		let axis = $btn.attr('id')[6].toLowerCase();
		$btn.toggleClass('enabled');
		if ($btn.hasClass('enabled')) {
			invert[axis] = 1;
			$btn.text(axis.toUpperCase() + ' normal');
		} else {
			invert[axis] = -1;
			$btn.text(axis.toUpperCase() + ' inverted');
		}
		log(invert);
	}
	$('#invertX').click(toggleControls);
	$('#invertY').click(toggleControls);
	$('#invertZ').click(toggleControls);

	function toggleSpeedShifters() {
		let $btn = $(this);
		$btn.toggleClass('enabled');
		speedShift = $btn.hasClass('enabled');
	}
	$('#speedShift').click(toggleSpeedShifters);

	async function loop() {
		if (gamepadConnected || gamepad.isConnected()) {
			let multi = 1;
			for (let i in btns) {
				let btn = btns[i];
				let query = btn.query();
				// if button is not pressed, query is false and unchanged
				if (!btnStates[i] && !query) {
					continue;
				}
				// if button is held, query is true and unchanged
				if (btnStates[i] && query) {
					// log(i + ' button press held');
					if (i == 'lt') {
						multi = .5;
					} else if (i == 'rt') {
						multi = 5;
					}
					continue;
				}
				// save button state change
				btnStates[i] = query;
				// if button press ended query is false
				if (!query) {
					// log(i + ' button press end');
					continue;
				}
				// if button press just started, query is true
				if (arg.v) {
					log(i + ' button press start');
				}
			}
			let stickR = gamepad.stick('right').query();
            let stickL = gamepad.stick('left').query();
			let gyro = {
				z: ((gyaxises.includes('x')) ? stickR.x : 0),
				x: ((gyaxises.includes('y')) ? stickR.y : 0),
				y: ((gyaxises.includes('z')) ? stickR.z : 0)
			};
            let accel = {
				x: ((acaxises.includes('x')) ? stickL.x : 0),
				z: ((acaxises.includes('y')) ? stickL.y : 0),   // Y <-> Z in Cemuhook
				y: ((acaxises.includes('z')) ? stickL.z : 0)
			};
			for (axis of gyaxises) {
				if (gyro[axis] > stickDeadZone) {
					gyro[axis] = gySens * gyro[axis];
					inNuetralPos[axis] = false;
				} else if (gyro[axis] < -stickDeadZone) {
					gyro[axis] = gySens * gyro[axis];
					inNuetralPos[axis] = false;
				}
				gyro[axis] *= invert[axis];
				if (speedShift) {
					gyro[axis] *= multi;
				}
            }
			for (axis of acaxises) {
				if (accel[axis] > stickDeadZone) {
					accel[axis] = acSens * accel[axis];
					inNuetralPos[axis] = false;
				} else if (accel[axis] < -stickDeadZone) {
					accel[axis] = acSens * accel[axis];
					inNuetralPos[axis] = false;
				}
				// accel[axis] *= invert[axis];
				if (speedShift) {
					accel[axis] *= multi;
				}
			}
			// gyro.y *= -1;
            log(gyro, accel);
			gyroServer.sendMotionData(gyro, accel);

			if (!gamepadConnected) {
				log('gamepad connected!');
				$('#gamepadIndicator').text('Gamepad Connected!');
				gamepadConnected = true;
			}
		}
		requestAnimationFrame(loop);
	}

	loop();

	const wss = new WebSocket.Server({
		port: 1337
	});

	wss.on("connection", function connection(ws) {
		log("WS Connected");
		phoneIsConnected = true;
		$('#phoneIndicator').text('Phone connected!');
		ws.on("message", function incoming(message) {
			// log(message);
			data = JSON.parse(message);
			gyroServer.sendMotionData(data.gyro, null, data.ts);
		});
		ws.on("error", () => {
			phoneIsConnected = false;
			log("WS ERROR");
		});
		ws.on("close", () => {
			phoneIsConnected = false;
			log("WS Disconnected");
			$('#phoneIndicator').text('Phone disconnected');
		});
	});

	/////////////////////////////////////////////////

	let express = require('express');
	let xps = express();

	// set up the template engine
	xps.set('views', __rootDir + '/views');
	xps.set('view engine', 'pug');
	xps.use("/js", express.static(path.join(__dirname, '../js')));

	// GET response for '/'
	xps.get('/', function(req, res) {
		res.render('pug/client');
	});

	// start up the server
	xps.listen(8080, function() {
		log(`
## Usage
1. Run Cemu.exe and Checked Options->GamePad mation source->DSU1->By Slot
2. Use your phone‘s browser (safair or chrome) open the following url`);
		let interfaces = require("os").networkInterfaces();
		for (let k in interfaces) {
			for (let i in interfaces[k]) {
				if (
					interfaces[k][i].family == "IPv4" &&
					interfaces[k][i].address != "127.0.0.1"
				) {
					let url = "http://" + interfaces[k][i].address + ":8080";
					log(url);
					$('#phoneURL').text($('#phoneURL').text() + url + ' ');
				}
			}
		}
	});

	require('process').on('uncaughtException', function(err) {
		log(err)
	});
};