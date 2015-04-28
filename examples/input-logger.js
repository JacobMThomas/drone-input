var dronestick = require('../index.js')
	control = new drone_input(),
	fs = require('fs'),
	microtime = require('microtime');		// for super accurate time keeping

var filepath = "input.log";

var log = [];
var index = -1;
control.on("action", function(data) {
	console.log(data);
	var now = microtime.now();
	if(index > 0) {
		var previous = log[index];
		var diff = now - previous.timestamp;
		var out;
		if(diff > 0) {

			out = {timestamp: now,  timedelta: diff, data: data};
			log.push(out);
			index++;

			try {
				var outstr = JSON.stringify(out);
				fs.appendFile(filepath, outstr + "\r\n", function (err) {
					if(err) {
						console.log("> Error writing to file");
					} else {
						console.log(outstr);
					}
				});
			} catch(e) {
				console.log("> Error while stringify-ing input at index " + log.length-1);
			}
		}

	} else {
		log.push({timestamp: now, timedelta: 0, data: data});
		index++;
	}

});

