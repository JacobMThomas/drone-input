var dronestick = require('../index.js')
	control = new drone_input(),
	fs = require('fs'),
	microtime = require('microtime');		// for super accurate time keeping

function fileToArray(filepath) {
	var file = fs.readFileSync(filepath).toString();
	return file.split("\r\n");
}

function parseInput(log) {
	var input = [];
	var out;
	if(log.length > 0) {
		for(var i=0; i<log.length-1; i++) {
			if(log[i] != "\r\n" || log[i] != "") {
				try {
					out = JSON.parse(log[i])
					input.push(out);
				} catch(e) {
					console.log("> Error parsing input object at index " + i);
				}
			}
		}
	}
	return input;
}

function playbackInput(filepath) {
	var fileArray = fileToArray(filepath);

	if(fileArray && fileArray.length > 0) {
		var input = parseInput(fileArray);

		console.log("Got " + input.length + " input events.");
		
		var delay = 0;
		var thecontrol = control;
		for(var i=0; i<input.length; i++) {
			delay += input[i].timedelta;

			(function(input, i){
				setTimeout(function() {
					thecontrol.onAction(input.data.action, input.data.data, true);
					console.log(input);
				}, delay / 1000);
			})(input[i],i);
		}


	} else {
		console.log("Cannot read file.");
	}
}

playbackInput("input.log");