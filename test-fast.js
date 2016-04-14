var hedgejs		= require('./hedgejs');
var chartLib 	= require('./chart');
var pstack 		= require('pstack');
var fstool 		= require('fs-tool');
var _ 			= require('underscore');

var data	= {};

var symbols	= ['CURRENCY:EUR-CAD', 'CURRENCY:EUR-USD', 'CURRENCY:EUR-CHF', 'CURRENCY:EUR-GBP'];


var research = {
	width:	1920,
	height:	400,
	output:	'/data/research/01/{{name}}.png',
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
			prop:	'ma',
			type:	'rolling',
			period:	40
		}/*,
		range:	{
			period:	[20,60]
		}*/
	},{
		name:		'std',
		type:		'noiseless',
		options:	{
			prop:		'std',
			type:		'ma',
			period:		4
		}
	},{
		name:		'stdDelta',
		type:		'delta',
		options:	{
			prop:	'std'
		}
	},{
		name:		'polarity',
		type:		'ANDpolarity',
		options:	{
			propA:	'stdDelta',
			propB:	'std'
		}
	}],
	charts:	[{
		data:	['c'],
		polarity:	{
			c:	'polarity'
		}
	},{
		data:	['polarity']
	},{
		data:	['std']
	},{
		data:	['stdDelta']
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
