var	events = require('events'),
	joystick = require('joystick'),
	arDrone = require('ar-drone');

dronestick.prototype = new events.EventEmitter;
function drone_input(useJoystick) {

	var parent = this;

	this.client = arDrone.createClient();
	this.stick = new joystick(0, 3200, 350);

	this.updateFrequency = 100;					// how often to repeat commands (per input type)
	this.activities = [];						// current activities (e.g. buttons, analog sticks)

	this.debug = 0;							// debug verbosity
	this.commandCount = 0;

	this.speed = {
		rotation:		1,
		elevation:		1,
		translation:	1,
	}

	this.DIRECTION = {
		NONE:			'none',
		UP:				'up',
		DOWN:			'down',
		LEFT:			'left',
		RIGHT:			'right',
	}

	this.STICK_AXIS = {
		NONE:			'none',
		VERTICAL:		'vertical',
		HORIZONTAL:		'horizontal',
	}

	this.BUTTON_STATE = {
		NONE:			-1,
		UP: 			0,
		DOWN:			1,
	}

	this.ACTIONS = {
		NONE:			'none',
		IDLE:			'idle',
		ROTATE_LEFT:	'rotate left',
		ROTATE_RIGHT:	'rotate right',
		FORWARD:		'translate forward',
		BACKWARD:		'translate backward',
		LEFT:			'translate left',
		RIGHT:			'translate right',
		UP:				'elevation up',
		DOWN:			'elevation down',
		TAKEOFF:		'takeoff',
		LAND:			'land',
	}

	this.getButtonData = function(val) {
		
		var out = { value: val };

		if(out.value <= 0) {
			out.value =  (32767 - (val * -1)) / 32767;
		}

		return out;
	}

	this.getAnalogStickData = function(val, stickAxis) {

		var out = { value: val, direction: this.DIRECTION.NONE };
	
		if(out.value == 0) {
			out.direction = this.DIRECTION.NONE;
		} else if(out.value > 0) {
			if(stickAxis == parent.STICK_AXIS.HORIZONTAL) {
				out.direction = this.DIRECTION.RIGHT;
			} else {
				out.direction = this.DIRECTION.DOWN;
			}
		} else {
			if(stickAxis == parent.STICK_AXIS.HORIZONTAL) {
				out.direction = this.DIRECTION.LEFT;
			} else {
				out.direction = this.DIRECTION.UP;
			}
		}

		if(out.direction != this.DIRECTION.NONE) {
			out.value = (out.value / 32767);
		}

		out.value = out.value < 0 ? out.value * -1 : out.value;

		return out;
	}

	this.emitButtonEvent = function(data, button) {
		data = this.getButtonData(data.value);
		data.source = button;

		this.onInput(data);
	}

	this.emitStickEvent = function(data, stick, isHorizontal) {
		data = this.getAnalogStickData(data.value, isHorizontal);
		data.source = stick;

		this.onInput(data);
	}

	this.addActivity = function(action, data) {

		this.client.stop();

		if(	action == this.ACTIONS.IDLE ||
			action == this.ACTIONS.TAKEOFF ||
			action == this.ACTIONS.LAND) {
			return;
		}

		// remove existing activity
		this.removeActivity(action);

		var theaction = action;
		var timer = setInterval(function() {
			var activity = parent.getActivityForAction(theaction);
			if(data == null)
				return;
			parent.onAction(theaction, activity.data, 0);
		}, this.updateFrequency);
		var activity = { action: action , data: data, timer: timer };
		this.activities.push(activity);

		if(this.debug > 0) {
			console.log('this.addActivity: ' );
		}

		return activity;
	}

	this.getActivityForAction = function(action) {
		for(var i=0; i<this.activities.length; i++) {
			if(this.activities[i].action == action) {
				return this.activities[i];
			}
		}
		return null;
	}

	this.removeActivity = function(action) {
		var out = [];
		for(var i=0; i<this.activities.length; i++) {
			if(this.activities[i].action == action) {
				clearInterval(this.activities[i].timer);
			} else {
				out.push(this.activities[i]);
			}
		}
		this.activities = out;

		if(this.debug > 0) {
			console.log('removeActivity');
		}
	}

	this.updateActivity = function(action, data) {

		for(var i=0; i<this.activities.length; i++) {
			if(this.activities[i].action == action) {
				this.activities[i].data = data;
				return;
			}
		}

		this.addActivity(action, data);

		if(this.debug > 0) {
			console.log('updateActivity');
		}
	}

	this.isChangeInState = function(action, data) {

		for(var i=0; i<this.activities.length; i++) {
			if(this.activities[i].action == action) {
				return (this.activities[i].value != data.value);
			}
		}
		return true;
	}

	this.clearActivities = function() {
		for(var i=0; i<this.activities.length; i++) {
			clearInterval(this.activities[i].timer);
		}
		this.activities = [];
	}

	this.onAction = function(action, data, dontLimitIndex) {
/*
		// ignore initial state(s)
		if(!dontLimitIndex && this.commandCount < 8) {
			this.commandCount++;
			return;
		}
*/
		if(action == this.ACTIONS.IDLE) {
			this.clearActivities();
		} else if(this.isChangeInState(action, data)) {
			this.updateActivity(action, data);
		}

		var speed = data.value;

		switch(action) {

			case this.ACTIONS.NONE:
			case this.ACTIONS.IDLE:
				this.client.stop();
				break;
	
			case this.ACTIONS.ROTATE_LEFT:
				speed = data.value * this.speed.rotation;
				this.client.counterClockwise(speed);
				break;
	
			case this.ACTIONS.ROTATE_RIGHT:
				speed = data.value * this.speed.rotation;
				this.client.clockwise(speed);
				break;
	
			case this.ACTIONS.FORWARD:
				speed = data.value * this.speed.translation;
				this.client.front(speed);
				break;
	
			case this.ACTIONS.BACKWARD:
				speed = data.value * this.speed.translation;
				this.client.back(speed);
				break;
	
			case this.ACTIONS.LEFT:
				speed = data.value * this.speed.translation;
				this.client.left(speed);
				break;
	
			case this.ACTIONS.RIGHT:
				speed = data.value * this.speed.translation;
				this.client.right(speed);
				break;
	
			case this.ACTIONS.UP:
				speed = data.value * this.speed.elevation;
				this.client.up(speed);
				break;
	
			case this.ACTIONS.DOWN:
				speed = data.value * this.speed.elevation;
				this.client.down(speed);
				break;
	
			case this.ACTIONS.TAKEOFF:
				this.client.takeoff();
				break;
	
			case this.ACTIONS.LAND:
				this.client.land();
				break;
		
		}

		this.emit("action", { action: action, data: data });

		if(this.debug > 0) {
			console.log(action + ": " + speed);
		}

	}

	this.onInput = function(data) {

		if(data.value == 0) {
			this.onAction(this.ACTIONS.IDLE, data);
			return;
		}

		switch(data.source) {

			case "stick left":
				switch(data.direction) {
					case control.DIRECTION.NONE:
						break;
					case control.DIRECTION.LEFT:
						this.onAction(this.ACTIONS.ROTATE_LEFT, data);
						break;
					case control.DIRECTION.RIGHT:
						this.onAction(this.ACTIONS.ROTATE_RIGHT, data);
						break;
					case control.DIRECTION.UP:
						this.onAction(this.ACTIONS.FORWARD, data);
						break;
					case control.DIRECTION.DOWN:
						this.onAction(this.ACTIONS.BACKWARD, data);
						break;
				}
				break;

			case "stick right":
				switch(data.direction) {
					case control.DIRECTION.NONE:
						break;
					case control.DIRECTION.LEFT:
						return;
						break;
					case control.DIRECTION.RIGHT:
						return;
						break;
					case control.DIRECTION.UP:
						this.onAction(this.ACTIONS.UP, data);
						break;
					case control.DIRECTION.DOWN:
						this.onAction(this.ACTIONS.DOWN, data);
						break;
				}
				break;

			case "shoulder left":
				this.onAction(this.ACTIONS.LEFT, data);
				break;

			case "shoulder right":
				this.onAction(this.ACTIONS.RIGHT, data);
				break;

			case "triangle":
				if(data.value == this.BUTTON_STATE.DOWN) {
					this.onAction(this.ACTIONS.TAKEOFF, data);
				}
				break;

			case "cross":
				if(data.value == this.BUTTON_STATE.DOWN) {
					this.onAction(this.ACTIONS.LAND, data);
				}
				break;

		}

		this.emit("input", data);

	}

	this.stick.on('button', function(data) {

		switch(data.number) {

			case 12:
				parent.emitButtonEvent(data, "triangle");
				break;

			case 14:
				parent.emitButtonEvent(data, "cross");
				break;

		}

	});

	this.stick.on('axis', function(data) {

		switch(data.number) {

			case 0:
				parent.emitStickEvent(data, "stick left", parent.STICK_AXIS.HORIZONTAL);
				break;

			case 1:
				parent.emitStickEvent(data, "stick left", parent.STICK_AXIS.VERTICAL);
				break;

			case 2:
				parent.emitStickEvent(data, "stick right", parent.STICK_AXIS.HORIZONTAL);
				break;

			case 3:
				parent.emitStickEvent(data, "stick right", parent.STICK_AXIS.VERTICAL);
				break;

			case 14:
				if(data.value > 0) return;
				parent.emitButtonEvent(data, "shoulder left");
				break;

			case 15:
				if(data.value > 0) return;
				parent.emitButtonEvent(data, "shoulder right");
				break;

		}

	});

	// start
	if(this.debug > -1) {
		console.log("Waiting for input...");
	}

}
module.exports = drone_input;