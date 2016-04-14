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
	output:	'/data/research/02/{{name}}.png',
	transforms:	[{
		name:		'ma1',
		type:		'noiseless',
		options:	{
			type:		'noiseless',
			level:		10
		}
	},{
		name:		'delta1',
		type:		'delta',
		options:	{
			prop:	'ma1'
		}
	},{
		name:		'ma2',
		type:		'noiseless',
		options:	{
			type:		'ma',
			level:		20
		}
	},{
		name:		'delta2',
		type:		'delta',
		options:	{
			prop:	'ma2'
		}
	},{
		name:		'delta1N',
		type:		'normalize',
		options:	{
			prop:	'delta1',
			min:	-1,
			max:	1,
			symmetry:true
		}
	},{
		name:		'pdelta1',
		type:		'polarity',
		options:	{
			prop:	'delta1'
		}
	},{
		name:		'delta2N',
		type:		'normalize',
		options:	{
			prop:	'delta2',
			min:	-1,
			max:	1,
			symmetry:true
		}
	},{
		name:		'pdelta2',
		type:		'polarity',
		options:	{
			prop:	'delta2'
		}
	}],
	charts:	[{
		data:	['c','ma1'],
		polarity:	{
			c:	'delta1'
		}
	},{
		data:	['c','ma2'],
		polarity:	{
			c:	'delta2'
		}
	},{
		data:	['delta2N','pdelta2'],
		range:	'sync'
	},{
		data:	['delta1N','pdelta1'],
		range:	'sync'
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
