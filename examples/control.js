var dronestick = require('../index.js')
	control = new drone_input();

control.on("action", function(data) {
	console.log(data);
});

