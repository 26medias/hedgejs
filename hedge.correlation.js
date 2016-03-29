
var _ 				= require('underscore');
var moment			= require('moment');
var activetick 		= require('node-activetick');
var techChart 		= require('techChart');
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
	
	this.market = hedge.market;
}
hedgejs.prototype.correlate = function(data, options) {
	var scope = this;
	
	options = _.extend({
		maxdelay:	30,
		prop:		'c'
	}, options);
	
	var series = [];
	_.each(data, function(v,k) {
		series.push(_.map(v, function(item) {
			return item[options.prop];
		}));
	});
	
	
	this.hedge.debug("series", series);
	
	
	var i,j,delay,n;
	var mx,my,sx,sy,sxy,denom,r;

	/* Calculate the mean of the two series x[], y[] */
	mx = 0;
	my = 0;
	var n = Math.min(series[0].length, series[1].length);
	for (i=0;i<n;i++) {
		mx += series[0][i];
		my += series[1][i];
	}
	mx /= n;
	my /= n;

	/* Calculate the denominator */
	sx = 0;
	sy = 0;
	for (i=0;i<n;i++) {
		sx += (series[0][i] - mx) * (series[0][i] - mx);
		sy += (series[1][i] - my) * (series[1][i] - my);
	}
	denom = Math.sqrt(sx*sy);
	
	var delays = [];
	
	/* Calculate the correlation series */
	for (delay=-options.maxdelay;delay<options.maxdelay;delay++) {
		sxy = 0;
		for (i=0;i<n;i++) {
			j = i + delay;
			if (j < 0 || j >= n) {
				continue;
			} else {
				sxy += (series[0][i] - mx) * (series[1][j] - my);
				/* Or should it be (?)
				if (j < 0 || j >= n)
				sxy += (x[i] - mx) * (-my);
				else
				sxy += (x[i] - mx) * (y[j] - my);
				*/
			}
		}
		r = sxy / denom;
		delays.push({
			delay:	delay,
			r:		r
		});
		/* r is the correlation coefficient at "delay" */

	}
	
	console.log("delays",delays);
	
	this.hedge.debug("delays", delays);
	
	return delays;
}



module.exports = hedgejs;
