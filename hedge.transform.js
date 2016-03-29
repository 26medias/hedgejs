
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
		propOut:'_c'
	}, options);
	
	var range = {
		min:	_.min(data, function(item) {
			return item[options.prop];
		})[options.prop],
		max:	_.max(data, function(item) {
			return item[options.prop];
		})[options.prop]
	}
	
	return _.map(data, function(item) {
		item[options.propOut]	= scope.map(item[options.prop], range.min, range.max, options.min, options.max);
		return item;
	});
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
