var hedgejs		= require('./../hedgejs');
var _ 			= require('underscore');

module.exports = function(dataset, settings, callback) {
	
	var hedge		= new hedgejs({});
	
	settings	= _.extend({
		balance:	10000,
		leverage:	1,
		risk:		0.2,
		ts:			1,
		smoothing:	14,
		stdPeriod:	14,
		rangePeriod:14,
		trend:		100
	}, settings);
	
	// Moving Average
	dataset = hedge.transform.noiseless(dataset, {
		type:		'ma',
		prop:		'c',
		propOut:	'ma',
		period:		settings.smoothing,
	});
	dataset = hedge.transform.noiseless(dataset, {
		type:		'ma',
		prop:		'c',
		propOut:	'trend',
		period:		settings.trend,
	});
	// Moving Average Delta
	dataset = hedge.transform.delta(dataset, {
		type:		'lag',
		prop:		'ma',
		propOut:	'delta',
		period:		2
	});
	dataset = hedge.transform.delta(dataset, {
		type:		'lag',
		prop:		'trend',
		propOut:	'confirm',
		period:		2
	});
	// Normalize on the [-1;1] range, in preparation for the ANDpolarity gate
	dataset = hedge.transform.normalize(dataset, {
		prop:		'delta',
		propOut:	'delta',
		period:		2,
		min:		-1,
		max:		1,
		symmetry:	true
	});
	// Difference between the price and the MA
	dataset = hedge.transform.diff(dataset, {
		type:		'lag',
		propA:		'c',
		propB:		'ma',
		propOut:	'diff'
	});
	// Normalize on the [-1;1] range, in preparation for the ANDpolarity gate
	dataset = hedge.transform.normalize(dataset, {
		prop:		'diff',
		propOut:	'diff',
		period:		2,
		min:		-1,
		max:		1,
		symmetry:	true
	});
	// AND Polarity
	dataset = hedge.transform.ANDpolarity(dataset, {
		propA:		'diff',
		propB:		'delta',
		propOut:	'polarity'
	});
	// Stochastic Standardization
	dataset = hedge.transform.standardize(dataset, {
		type:		'rolling',
		prop:		'ma',
		propOut:	'std',
		period:		settings.stdPeriod,
	});
	// Trading Range
	dataset = hedge.transform.range(dataset, {
		propOpen:	'o',
		propClose:	'c',
		propOut:	'range',
		period:		settings.rangePeriod
	});
	
	
	
	// Backtest
	var backtest = hedge.trader.backtest({
		rules:	{
			balance:	settings.balance,
			leverage:	settings.leverage
		},
		data:	{
			main:		dataset,	// Main data, mandatory
			std:		_.map(dataset, function(item) {
				return item.std;
			}),
			range:		_.map(dataset, function(item) {
				return item.range;
			}),
			polarity:	_.map(dataset, function(item) {
				return item.polarity;
			}),
			trend:		_.map(dataset, function(item) {
				return item.confirm;
			})
		},
		buffer:	settings,
		trade:	function(n, data, buffer) {
			
			var limit = Math.max(settings.smoothing, settings.stdPeriod, settings.rangePeriod);
			
			if (n>limit) {
				if (data.polarity[n]>0 && data.polarity[n-1]<=0 && data.trend[n]>0) {
					this.closeAll('sell');
					this.buy({
						lots:	this.balance*buffer.risk,
						TS:		-data.range[n]*buffer.ts
					});
				}
				if (data.polarity[n]<0 && data.polarity[n-1]>=0 && data.trend[n]<0) {
					this.closeAll('buy');
					this.sell({
						lots:	this.balance*buffer.risk,
						TS:		data.range[n]*buffer.ts
					});
				}
			}
			return true;
			
		}
	});
	
	
	
	
	callback(backtest.stats().metrics);
	
	return true;
}