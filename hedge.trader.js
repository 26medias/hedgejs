
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
		
		//console.log("Gain",position.gain,position.lots);
		
		this.profits	+= position.gain;
		this.balance	+= position.cost+position.gain;
		
		return this;
	};
	api.prototype.closeAll = function(type) {
		var scope = this;
		_.each(this.positions, function(pos) {
			if (!pos.closed) {
				if (!type || (type && pos.type=='type')) {
					scope.close(pos.id);
				}
			}
		});
		return this;
	};
	api.prototype.stats = function() {
		var scope = this;
		
		var netGain = this.balance-options.rules.balance;
		
		var won	= _.filter(this.positions, function(item) {
			return item.gain>0;
		});
		var lost	= _.filter(this.positions, function(item) {
			return item.gain<0;
		});
		
		var sum = 0;
		_.each(won, function(item) {
			sum	+= item.gain;
		});
		var avgWin	= sum/won.length;
		
		sum = 0;
		_.each(lost, function(item) {
			sum	+= item.gain;
		});
		var avgLoss	= sum/lost.length;
		
		
		var metrics	 = {
			start:		options.rules.balance,
			end:		this.balance,
			gain:		netGain,
			gainPct:	(netGain/options.rules.balance*100).toFixed(2)+'%',
			positions:	this.positions.length,
			won:		won.length,
			lost:		lost.length,
			pctWin:		(won.length/this.positions.length*100).toFixed(2)+'%',
			avgWin:		avgWin,
			avgLoss:	avgLoss,
			winRatio:	avgWin/Math.abs(avgLoss),
			leverage:	options.rules.leverage
		};
		
		
		var frequencies	 = {
			gains:		this.getFrequencyGroup(this.positions, function(item) {
				return item.gain;
			}, {
				groups:	40
			}),
			pct:		this.getFrequencyGroup(this.positions, function(item) {
				if (item.type=='buy') {
					return (item.exit-item.entry)/item.entry*100;
				}
				if (item.type=='sell') {
					return (item.entry-item.exit)/item.entry*100;
				}
				return 0;
			}, {
				groups:	40
			}),
			duration:	this.getFrequencyGroup(this.positions, function(item) {
				return item.ended-item.started;
			}, {
				groups:	40
			}),
			durationWin:	this.getFrequencyGroup(_.filter(this.positions, function(item) {return item.gain>0}), function(item) {
				return item.ended-item.started;
			}, {
				groups:	40
			}),
			durationLose:	this.getFrequencyGroup(_.filter(this.positions, function(item) {return item.gain<0}), function(item) {
				return item.ended-item.started;
			}, {
				groups:	40
			}),
		};
		metrics.range	= {
			gains:			frequencies.gains.range,
			gainsPct:		frequencies.pct.range,
			duration:		frequencies.duration.range,
			durationWin:	frequencies.durationWin.range,
			durationLose:	frequencies.durationLose.range,
		};
		
		
		
		return {
			metrics:		metrics,
			frequencies:	frequencies
		};
	};
	api.prototype.getFrequencyGroup = function(dataset, iterator, options) {
		options	= _.extend({
			groups:	10
		}, options);
		var values		= _.map(dataset, iterator);
		var realRange	 = {
			min:	_.min(values),
			max:	_.max(values)
		};
		var range		= Math.max(Math.abs(realRange.min), Math.abs(realRange.max))
		var groupRange	= range/options.groups;
		var cols		= [];
		var i;
		for (i=0;i<=range;i+=groupRange) {
			cols.push(i);
			if (i>0) {
				cols.push(-i);
			}
		}
		cols.sort(function(a,b) {
			return a-b;;
		});
		//var cols		= _.union(_.range(-range,0+groupRange,groupRange),0,_.range(0, range+groupRange, groupRange));
		//var output		= new Int32Array(cols.length);
		//var output		= _.map(cols, function() {return {};});
		var output		= _.map(cols, function() {return 0;});
		
		_.each(values, function(value) {
			_.each(cols, function(v, n) {
				if (n<cols.length-1) {
					if (value>=cols[n] && value<=cols[n+1]) {
						output[n]++;
					}
				}
			});
		});
		output.pop();	// remove the last element
		return {
			cols:	cols,
			data:	output,
			range:	realRange
		};
	};
	api.prototype.getObjects = function() {
		var output = [];
		_.each(this.positions, function(position) {
			
			output.push({
				type:	'line',
				coords:	[position.started,position.entry,position.ended,position.exit]
			});
			
			
			// Add the objects
			if (position.TP) {
				output.push({
					type:	'TP',
					value:	position.TP,
					from:	position.started,
					length:	position.ended-position.started
				});
			}
			if (position.SL) {
				output.push({
					type:	'SL',
					value:	position.SL,
					from:	position.started,
					length:	position.ended-position.started
				});
			}
			if (position.TP && position.SL) {
				output.push({
					type:	'line',
					coords:	[position.started,Math.max(position.entry, position.exit),position.started,Math.min(position.entry, position.exit)]
				});
				output.push({
					type:	'line',
					coords:	[position.ended,Math.max(position.entry, position.exit),position.ended,Math.min(position.entry, position.exit)]
				});
				if (position.entry!=position.TP&&position.entry!=position.SL) {
					output.push({
						type:	'line',
						coords:	[position.started,position.entry,position.ended,position.entry]
					});
				}
			}
			
			// Add the buy and sell marks
			if (position.type=='buy') {
				output.push({
					type:	'mark-down',
					x:		position.started,
					y:		position.entry,
					color:	{r:88,g:144,b:255,a:255}
				});
			}
			if (position.type=='sell') {
				output.push({
					type:	'mark-up',
					x:		position.started,
					y:		position.entry,
					color:	{r:216,g:17,b:89,a:255}
				});
			}
			
			
		});
		
		return output;
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
