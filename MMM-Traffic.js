/* global Module */

/* Magic Mirror
 * Module: MMM-Traffic
 *
 * By Sam Lewis https://github.com/SamLewis0602
 * MIT Licensed.
 */

Module.register('MMM-Traffic', {

    defaults: {
        api_key: '',
        interval: 300000, //all modules use milliseconds
        traffic_model: 'best_guess',
        loadingText: 'Loading commute...',
        prependText: 'Current commute is',
        changeColor: false,
        limitYellow: 10,
        limitRed: 30,
        showGreen: true,
        language: config.language,
    	trips:	[
		{
			route_name: 'Default',
			mode: 'driving',
			origin: '',
			destination: '',
			departure_time: 'now',
			arrival_time: '',
			show_summary: true
		}
	]
    },

    start: function() {
	    Log.info('Starting module: ' + this.name);
	    if (this.data.classes === 'MMM-Traffic') {
		    this.data.classes = 'bright medium';
	    }
	    this.loaded = false;

	    this.symbols = {
		    'driving': 'fa fa-car',
		    'walking': 'fa fa-odnoklassniki',
		    'bicycling': 'fa fa-bicycle',
		    'transit': 'fa fa-train'
	    };

	    for (var t in self.config.trips) {
	    	var trip = self.config.trips[t];

		    trip.leaveBy = '';
		    trip.url = encodeURI('https://maps.googleapis.com/maps/api/directions/json' + trip.getParams());
		    trip.commute = '';
		    trip.summary = '';
		    trip.updateCommute(trip);

		    self.config.trips[t] = trip;
		    console.log("URL: " + trip.url);
		}
    },

    updateCommute: function(self) {
    	for (var t in self.config.trips) {
    		var trip = self.config.trips[t];

		    if (trip.arrival_time.length == 4) {
			    self.sendSocketNotification('LEAVE_BY', {'url':self.url, 'arrival':trip.arrival_time});
		    } else {
			    self.sendSocketNotification('TRAFFIC_URL', self.url);
		    }
		    setTimeout(self.updateCommute, self.config.interval, self);
	    }
    },

    getStyles: function() {
	    return ['traffic.css', 'font-awesome.css'];
    },

    getDom: function() {
	    var wrapper = document.createElement("div");

	    if (!this.loaded) {
		    wrapper.innerHTML = this.config.loadingText;
		    return wrapper;
	    }

    	var treks = this.createTripList();

	    for (var t in treks) {
		    var commuteInfo = document.createElement("div"); //support for config.changeColor
		    //symbol
		    var symbol = document.createElement('span');
		    symbol.className = this.symbols[trek.mode] + ' symbol';
		    commuteInfo.appendChild(symbol);

		    var trek = treks[t];

		    if (trek.arrival_time == '') {
		    //commute time
			    var trafficInfo = document.createElement('span');
			    trafficInfo.innerHTML = this.config.prependText + ' ' + this.commute;
			    commuteInfo.appendChild(trafficInfo);
			    
		    //change color if desired and append
			    if (this.config.changeColor) {
				    if (this.trafficComparison >= 1 + (this.config.limitRed / 100)) {
					    commuteInfo.className += ' red';
				    } else if (this.trafficComparison >= 1 + (this.config.limitYellow / 100)) {
					    commuteInfo.className += ' yellow';
				    } else if (this.config.showGreen) {
					    commuteInfo.className += ' green';
				    }
			    }
			    wrapper.appendChild(commuteInfo);
			    
		    //routeName
			    if (trek.route_name) {
				    var routeName = document.createElement('div');
				    routeName.className = 'dimmed small';
				    if (this.summary.length > 0 && trek.show_summary){
					    routeName.innerHTML = trek.route_name + ' via ' + this.summary; //todo translatable?
				    } else {
					    routeName.innerHTML = trek.route_name;
				    }
				    wrapper.appendChild(routeName);
			    }
		    } else {
		    //leave-by time
			    var trafficInfo = document.createElement('span');
			    trafficInfo.innerHTML = "Leave by " + trek.leaveBy;
			    commuteInfo.appendChild(trafficInfo);
			    wrapper.appendChild(commuteInfo);
			    
		    //routeName
			    if (trek.route_name) {
				    var routeName = document.createElement('div');
				    routeName.className = 'dimmed small';
				    if (this.summary.length > 0 && trek.show_summary){
					    routeName.innerHTML = trek.route_name + ' via ' + this.summary + " to arrive by " + trek.arrival_time.substring(0,2) + ":" + trek.arrival_time.substring(2,4);
				    } else {
					    console.log(typeof trek.arrival_time );
					    routeName.innerHTML = trek.route_name + " to arrive by " + trek.arrival_time.substring(0,2) + ":" + trek.arrival_time.substring(2,4);
				    }
				    wrapper.appendChild(routeName);
			    }
		    }
		}
	    return wrapper;
    },

    createTripList: function() {
    	var treks = [];
    	for (var t in this.config.trips) {
    		var trek = this.config.trips[t];
    		treks.push(trek);
    	}
    	return treks;
    },

    getParams: function() {
	    var params = '?';
	    params += 'mode=' + this.config.mode;
	    params += '&origin=' + this.config.origin;
	    params += '&destination=' + this.config.destination;
	    params += '&key=' + this.config.api_key;
	    params += '&traffic_model=' + this.config.traffic_model;
	    params += '&language=' + this.config.language;
	    return params;
    },

    socketNotificationReceived: function(notification, payload) {
	    this.leaveBy = '';
	    if (notification === 'TRAFFIC_COMMUTE' && payload.url === this.url) {
		    Log.info('received TRAFFIC_COMMUTE');
		    this.commute = payload.commute;
		    this.summary = payload.summary;
		    this.trafficComparison = payload.trafficComparison;
		    this.loaded = true;
		    this.updateDom(1000);
	    } else if (notification === 'TRAFFIC_TIMING') {
		    Log.info('received TRAFFIC_TIMING');
		    this.leaveBy = payload.commute;
		    this.summary = payload.summary;
		    this.loaded = true;
		    this.updateDom(1000);
	    }
    }

});
