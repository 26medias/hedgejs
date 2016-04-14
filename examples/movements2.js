var hedgejs		= require('../hedgejs');
var chartLib 	= require('../chart');
var pstack 		= require('pstack');
var fstool 		= require('fs-tool');
var _ 			= require('underscore');

var data	= {};

var symbols	= ['CURRENCY:EUR-CAD'/*, 'CURRENCY:EUR-USD', 'CURRENCY:EUR-CHF', 'CURRENCY:EUR-GBP'*/];


var research = {
	width:	1920,
	height:	400,
	grid:	{
		x:	24
	},
	output:	'/data/research/03/{{name}}.png',
	transforms:	[{
		name:		'ma',
		type:		'noiseless',
		options:	{
			type:		'ma',
			period:		10
		}
	},{
		name:		'std',
		type:		'standardize',
		options:	{
			type:	'rolling',
			prop:	'ma',
			period:	50
		},
		range:	{
			period:	[24,48]
		},
		sub:	[{
			type:		'noiseless',
			options:	{
				type:		'ma',
				period:		10
			}
		}, {
			type:		'normalize',
			options:	{
				min:	-1,
				max:	1
			}
		}]
	}],
	charts:	[{
		data:	['c']/*,
		polarity:	{
			c:	'std'
		}*/
	},{
		data:	['std'],
		range:	'sync',
		objects:	[{
			type:	'hline',
			y:		0.6
		},{
			type:	'hline',
			y:		-0.6
		}]
	}]
};


var stack	= new pstack({
	async:	false
});
var hedge	= new hedgejs({});

_.each(symbols, function(symbol) {
	stack.add(function(done) {
		hedge.market.open(symbol);
		hedge.market.from(new Date(2016,0,01));
		hedge.market.to(new Date(2016,1,20));
		hedge.market.timeframe('1h');
		hedge.market.fetch(function(response) {
			data[symbol]	= response;
			done();
			return true;
		});
		return true;
	});
	return true;
});

stack.add(function(done) {
	hedge.chart.build(data, research, done);
});

stack.start(function() {
	console.log("Completed.");
});
