
var _ 				= require('underscore');
var moment			= require('moment');
var activetick 		= require('node-activetick');
var techChart 		= require('techChart');
var shortid 		= require('shortid');
var fstool 			= require('fs-tool');
var transform 		= require('timeseries-transform');
var airbase 		= new (require('airbase'))();

var hedgejs = function(hedge, options) {
	this.options = _.extend({
		server: {
			host:   '127.0.0.1',
	    	port:   5000,
	    	cache:	'file',
	    	dir:	'data'
		}
	}, options);
	
	this.hedge	= hedge;
}
hedgejs.prototype.backtest = function(options) {
	
	
	var api = function() {
		this.n			= 0;
		this.positions	= [];
		this.balance	= options.rules.balance;
		this.leverage	= options.rules.leverage;
		this.profits	= 0;
		this.charts		= {
			balance:	[],
			profits:	[],
			value:		[]
		};
		this.objects	= [];
	};
	api.prototype.lots = function(count, value, leveraged) {
		if (!leveraged) {
			var leverage = 1;
		} else {
			var leverage = this.leverage;
		}
		if (value) {
			return value*count*leverage;
		} else {
			return options.data.main[this.n].c*count*leverage;
		}
		
	};
	api.prototype.buy = function(config) {
		var position	 = _.extend({
			id:		shortid.generate(),
			type:	'buy',
			started:this.n,
			ended:	false,
			entry:	options.data.main[this.n].c,
			exit:	false,
			lots:	200,
			closed:	false
		}, config);
		
		position.cost	= this.lots(position.lots);
		position.value	= this.lots(position.lots, false, true);
		
		if (position.SL) {
			position.SL	+= position.entry;
		}
		if (position.TP) {
			position.TP	+= position.entry;
		}
		if (position.TS) {
			position.SL	= position.entry+position.TS;
		}
		
		if (this.balance-position.cost >= 0) {
			// Debit the money from the account balance
			this.balance -= position.cost;
		} else {
			return false;
		}
		
		
		//console.log("",JSON.stringify(position, null, 4));
		
		// Execute the position
		this.positions.push(position);
		
		return position;
	};
	api.prototype.sell = function(config) {
		var position	 = _.extend({
			id:		shortid.generate(),
			type:	'sell',
			started:this.n,
			ended:	false,
			entry:	options.data.main[this.n].c,
			exit:	false,
			lots:	200,
			closed:	false
		}, config);
		
		position.cost	= this.lots(position.lots);
		position.value	= this.lots(position.lots, false, true);
		
		if (position.SL) {
			position.SL	+= position.entry;
		}
		if (position.TP) {
			position.TP	+= position.entry;
		}
		if (position.TS) {
			position.SL	= position.entry+position.TS;
		}
		
		if (this.balance-position.cost >= 0) {
			// Debit the money from the account balance
			this.balance -= position.cost;
		} else {
			return false;
		}
		
		
		//console.log("",JSON.stringify(position, null, 4));
		
		// Execute the position
		this.positions.push(position);
		
		return position;
	};
	api.prototype.close = function(id, value) {
		var position = _.find(this.positions, function(pos) {
			return pos.id==id;
		});
		
		//console.log("CLOSE",position.id);
		
		if (!position) {
			return false;
		}
		
		position.closed	 	= true;
		position.ended	 	= this.n;
		
		if (value) {
			position.closeValue	= this.lots(position.lots, value, true);
			position.exit		= value;
		} else {
			position.closeValue	= this.lots(position.lots, false, true);
			position.exit		= options.data.main[this.n].c;
		}
		
		
		switch (position.type) {
			case "buy":
				position.gain		= position.closeValue-position.value;
			break;
			case "sell":
				position.gain		= position.value-position.closeValue;
			break;
		}
		
		console.log("Gain",position.gain,position.lots);
		
		this.profits	+= position.gain;
		this.balance	+= position.cost+position.gain;
		
		return this;
	};
	api.prototype.closeAll = function() {
		var scope = this;
		_.each(this.positions, function(pos) {
			if (!pos.closed) {
				scope.close(pos.id);
			}
		});
		return this;
	};
	api.prototype.stats = function() {
		var scope = this;
		
		var netGain = this.balance-options.rules.balance;
		
		var stats = {
			start:		options.rules.balance,
			end:		this.balance,
			leverage:	options.rules.leverage,
			gain:		netGain,
			gainPct:	(netGain/options.rules.balance*100).toFixed(2)+'%'
		};
		return stats;
	};
	api.prototype.update = function() {
		var scope = this;
		
		// Calculate the current value
		var currentValue	= this.balance;
		
		_.each(this.positions, function(pos) {
			if (!pos.closed) {
				
				switch (pos.type) {
					case "buy":
						currentValue	+= pos.cost+(scope.lots(pos.lots, false, true)-pos.value);
					break;
					case "sell":
						currentValue	+= pos.cost+(pos.value-scope.lots(pos.lots, false, true));
					break;
				}
				
				
				// Trailing Stop
				if (pos.TS) {
					if (pos.type=='buy') {
						if (options.data.main[scope.n].c+pos.TS > pos.SL) {
							// Move up
							pos.SL = options.data.main[scope.n].c+pos.TS;
						}
					}
					if (pos.type=='sell') {
						if (options.data.main[scope.n].c+pos.TS < pos.SL) {
							// Move up
							pos.SL = options.data.main[scope.n].c+pos.TS;
						}
					}
				}
				// Close if required
				if (pos.TP && pos.type=='buy' && options.data.main[scope.n].c > pos.TP) {
					scope.close(pos.id, pos.TP);
				}
				if (pos.SL && pos.type=='buy' && options.data.main[scope.n].c < pos.SL) {
					scope.close(pos.id, pos.SL);
				}
				// Close if required
				if (pos.TP && pos.type=='sell' && options.data.main[scope.n].c < pos.TP) {
					scope.close(pos.id, pos.TP);
				}
				if (pos.SL && pos.type=='sell' && options.data.main[scope.n].c > pos.SL) {
					scope.close(pos.id, pos.SL);
				}
			}
		});
		
		this.charts.value.push(currentValue);
		
		return this;
	};
	
	
	var scope = this;
	
	var apiInstance = new api();
	
	var length = options.data.main.length;
	
	_.each(options.data.main, function(item, n) {
		
		apiInstance.n = n;
		
		apiInstance.update();
		
		options.trade.apply(apiInstance, [n, options.data, options.buffer]);
		
		if (n==length-1) {
			apiInstance.closeAll();
		}
		
		apiInstance.charts.balance.push(apiInstance.balance);
		apiInstance.charts.profits.push(apiInstance.profits);
	});
	
	return apiInstance;
}



module.exports = hedgejs;
