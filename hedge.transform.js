
var _ 				= require('underscore');

var hedgejs = function(hedge, options) {
	this.options = _.extend({
		server: {
			host:   '127.0.0.1',
	    	port:   5000,
	    	cache:	'file',
	    	dir:	'data'
		}
	}, options);
	
	this.market = hedge.market;
}
hedgejs.prototype.map = function( x,  in_min,  in_max,  out_min,  out_max) {
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
hedgejs.prototype.normalize = function(data, options) {
	var scope = this;
	options	= _.extend({
		min:	0,
		max:	1,
		prop:	'c',
		propOut:'_c',
		symmetry:false
	}, options);
	
	var range = {
		min:	_.min(data, function(item) {
			return item[options.prop];
		})[options.prop],
		max:	_.max(data, function(item) {
			return item[options.prop];
		})[options.prop]
	}
	
	if (options.symmetry) {
		var maxRange = Math.max(Math.abs(range.min),Math.abs(range.max));
		range.max = maxRange;
		range.min = -maxRange;
	}
	
	return _.map(data, function(item) {
		item[options.propOut]	= scope.map(item[options.prop], range.min, range.max, options.min, options.max);
		return item;
	});
}
hedgejs.prototype.standardize = function(data, options) {
	var scope = this;
	options	= _.extend({
		type:	'global',	//global,rolling
		period:	5,	// for the rolling standarization
		prop:	'c',
		propOut:'_c'
	}, options);
	
	switch (options.type) {
		default:
		case 'global':
			// Calculate the mean and standard deviation
			var sum, count, mean, stdev;
			sum = 0;
			_.each(data, function(item) {
				sum += item[options.prop];
			});
			mean = sum/data.length;
			sum = 0;
			_.each(data, function(item) {
				sum	+= Math.pow(Math.abs(item[options.prop]-mean),2);
			});
			stdev = Math.sqrt(sum/data.length);
			
			return _.map(data, function(item) {
				item[options.propOut]	= (item[options.prop]-mean)/stdev;
				return item;
			});
		break;
		case 'rolling':
			var output = _.map(data, function(value, n) {
				if (n < options.period) {
					return 0;
				} else {
					// Obtain the data subset
					var subset = data.slice(n-options.period, n+1);
					var sum, count, mean, stdev;
					sum = 0;
					_.each(subset, function(item) {
						sum += item[options.prop];
					});
					mean = sum/subset.length;
					sum = 0;
					_.each(subset, function(item) {
						sum	+= Math.pow(Math.abs(item[options.prop]-mean),2);
					});
					stdev = Math.sqrt(sum/subset.length);
					
					return (value[options.prop]-mean)/stdev;
				}
			});
			
			return _.map(data, function(item, n) {
				item[options.propOut]	= output[n];
				return item;
			});
		break;
	}
	
}
hedgejs.prototype.delta = function(data, options) {
	var scope = this;
	options	= _.extend({
		type:	'lag',	//lag/ma
		prop:	'c',
		propOut:'_c',
		period:	1
	}, options);
	
	
	if (options.type=='lag' || options.period<=1) {
		return _.map(data, function(item, n) {
			if (n<options.period) {
				item[options.propOut]	= 0;
			} else {
				item[options.propOut]	= item[options.prop]-data[n-options.period][options.prop];
			}
			return item;
		});
	} else if (options.type=='lagged-mean') {
		return _.map(data, function(item, n) {
			if (n<options.period) {
				item[options.propOut]	= 0;
			} else {
				// Calculate the average of the last points
				var i;
				var sum = 0;
				var c = 0;
				for (i=1;i<options.period;i++) {
					sum	+= data[n-i][options.prop];
					c++;
				}
				item[options.propOut]	= item[options.prop]-(sum/c);
			}
			return item;
		});
	} else {
		// Calculate the ma
		var noiseless	= this.noiseless(data, {
			type:		'ma',
			period:		options.period,
			prop:		options.prop,
			propOut:	'_tmp_ma'
		});
		
		// Calculate the delta
		return _.map(data, function(item, n) {
			//item = _.extend({},item);
			if (n==0) {
				item[options.propOut]	= 0;
			} else {
				item[options.propOut]	= item['_tmp_ma']-data[n-1]['_tmp_ma'];
			}
			return item;
		});
	}
}
hedgejs.prototype.range = function(data, options) {
	var scope = this;
	options	= _.extend({
		propOpen:	'o',
		propClose:	'c',
		propOut:	'range',
		period:		5
	}, options);
	
	// Calculate the delta
	return _.map(data, function(item, n) {
		//item = _.extend({},item);
		if (n<options.period) {
			item[options.propOut]	= 0;
		} else {
			var i;
			var sum	= {
				all:	0,
				up:		0,
				down:	0
			};
			var c = 0;
			var delta;
			for (i=0;i<options.period;i++) {
				delta	= Math.abs(data[n-i][options.propClose]-data[n-i][options.propOpen]);
				sum.all	+= delta;
				/*if (delta>0) {
					sum.up		+= delta;
				} else {
					sum.down	+= delta;
				}*/
				c++;
			}
			item[options.propOut]			= sum.all/c;
			//item[options.propOut+'_up']		= sum.up/c;
			//item[options.propOut+'_down']	= sum.down/c;
		}
		return item;
	});
	
}
hedgejs.prototype.diff = function(data, options) {
	var scope = this;
	options	= _.extend({
		propA:	'o',
		propB:	'c',
		propOut:'diff'
	}, options);
	
	// Calculate the delta
	return _.map(data, function(item, n) {
		item[options.propOut]	= item[options.propA]-item[options.propB];
		return item;
	});
}
hedgejs.prototype.ANDpolarity = function(data, options) {
	var scope = this;
	options	= _.extend({
		propA:	'o',
		propB:	'c',
		propOut:'polarity'
	}, options);
	
	return _.map(data, function(item, n) {
		if ((item[options.propA]>0 && item[options.propB]>0) || (item[options.propA]<0 && item[options.propB]<0)) {
			item[options.propOut]	= item[options.propA]+item[options.propB];
		} else {
			item[options.propOut]	= 0;
		}
		
		return item;
	});
}

hedgejs.prototype.polarity = function(data, options) {
	var scope = this;
	options	= _.extend({
		prop:	'c',
		propOut:'polarity'
	}, options);
	
	return _.map(data, function(item, n) {
		if (item[options.prop]>0) {
			item[options.propOut]	= 1;
		} else if (item[options.prop]<0) {
			item[options.propOut]	= -1;
		} else {
			item[options.propOut]	= 0;
		}
		
		return item;
	});
}

hedgejs.prototype.polarityCounter = function(data, options) {
	var scope = this;
	options	= _.extend({
		prop:	'polarity',
		propOut:'pCounter'
	}, options);
	
	var toPolarity = function(x) {
		var polarity = 0;
		if (x > 0) {
			polarity = 1;
		}
		if (x < 0) {
			polarity = -1;
		}
		return polarity;
	};
	
	// Calculate the delta
	return _.map(data, function(item, n) {
		var c = 1;
		var i = 0;
		var p	= toPolarity(data[n][options.prop]);
		if (p==0) {
			item[options.propOut] = 0;
		} else {
			while(n-c>=0 && p==toPolarity(data[n-c][options.prop])) {
				c++;
			}
			item[options.propOut]	= c;
		}
		return item;
	});
}
hedgejs.prototype.noiseless = function(data, options) {
	var scope = this;
	options	= _.extend({
		type:		'noiseless',
		period:		5,	// for moving averages and period relate algos (ma, sma, ...)
		level:		10,	// For the recursive smoothing algos (noiseless, ...)
		prop:		'c',
		propOut:	'_c'
	}, options);
	
	var buffer = _.map(data, function(item) {
		return item[options.prop];
	});
	
	switch (options.type) {
		case 'noiseless':
			var l = buffer.length;
			var i,j;
			for (j=0;j<options.level;j++) {
				for (i=1;i<l-1;i++) {
					buffer[i]	= (buffer[i-1]+buffer[i+1])/2;
				}
			}
		break;
		case 'ma':
			var l = buffer.length
			var output = [];
			for (i=0;i<options.period;i++) {
				output.push(buffer[i]);
			}
			var i,j,k;
			var sum;
			for (i=options.period;i<l;i++) {
				sum	= 0;
				for (k=options.period;k>0;k--) {
					sum += buffer[i-k];
				}
				output.push(sum/options.period);
			}
			buffer = output;
		break;
	}
	
	data	= _.map(data, function(item, n) {
		//item = _.extend({},item);
		item[options.propOut]	= buffer[n];
		return item;
	});
	
	
	return data;
}
hedgejs.prototype.noise = function(data, options) {
	var scope = this;
	options	= _.extend({
		type:		'noiseless',
		period:		5,	// for moving averages and period relate algos (ma, sma, ...)
		level:		10,	// For the recursive smoothing algos (noiseless, ...)
		prop:		'c',
		propOut:	'_c'
	}, options);
	
	var buffer = _.map(data, function(item) {
		return item[options.prop];
	});
	
	switch (options.type) {
		case 'noiseless':
			var l = buffer.length;
			var i,j;
			for (j=0;j<options.level;j++) {
				for (i=1;i<l-1;i++) {
					buffer[i]	= (buffer[i-1]+buffer[i+1])/2;
				}
			}
		break;
		case 'ma':
			var l = buffer.length
			var output = [];
			for (i=0;i<options.period;i++) {
				output.push(buffer[i]);
			}
			var i,j,k;
			var sum;
			for (i=options.period;i<l;i++) {
				sum	= 0;
				for (k=options.period;k>0;k--) {
					sum += buffer[i-k];
				}
				output.push(sum/options.period);
			}
			buffer = output;
		break;
	}
	
	var raw = _.map(data, function(item) {
		return item[options.prop];
	});
	
	for (i=0;i<l;i++) {
		buffer[i]	= raw[i]-buffer[i];
	}
	
	data	= _.each(data, function(item, n) {
		item[options.propOut]	= buffer[n];
		return item;
	});
	
	return data;
}
hedgejs.prototype.hmean = function(data, options) {
	var scope = this;
	options	= _.extend({
		
	}, options);
	
	var lengths = _.map(data, function(v,k) {
		return v.length;
	});
	
	var l		= lengths[0];
	var keys	= _.keys(data);
	var hl		= keys.length;
	
	var i;
	var sum,mean,stdev;
	
	var output = [];
	
	for (i=0;i<l;i++) {
		// Get the horizontal mean
		sum = 0;
		_.each(keys, function(k) {
			sum	+= data[k][i];
		});
		output.push(sum/hl);
	}
	
	return output;
}
hedgejs.prototype.hstdev = function(data, options) {
	var scope = this;
	options	= _.extend({
		
	}, options);
	
	var lengths = _.map(data, function(v,k) {
		return v.length;
	});
	
	var l		= lengths[0];
	var keys	= _.keys(data);
	var hl		= keys.length;
	
	var i;
	var sum,mean,stdev;
	
	var output = [];
	
	for (i=0;i<l;i++) {
		// Get the horizontal mean
		sum = 0;
		_.each(keys, function(k) {
			sum	+= data[k][i];
		});
		mean = sum/hl;
		// Get the stdev
		sum = 0;
		_.each(keys, function(k) {
			sum	+= Math.pow(Math.abs(data[k][i]-mean),2);
		});
		stdev = Math.sqrt(sum/hl);
		output.push(stdev);
	}
	
	return output;
}
module.exports = hedgejs;
