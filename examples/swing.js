var hedgejs		= require('../hedgejs');
var chartLib 	= require('../chart');
var pstack 		= require('pstack');
var fstool 		= require('fs-tool');
var _ 			= require('underscore');

var data	= {};

var symbols	= ['CURRENCY:EUR-CAD', 'CURRENCY:EUR-USD', 'CURRENCY:EUR-CHF', 'CURRENCY:EUR-GBP'];


var research = {
	width:	1920,
	height:	400,
	grid:	{
		x:	24
	},
	slice:	24,
	output:	'/data/research/04 - swing/{{name}}.png',
	transforms:	[{
		name:		'fma_delta',
		type:		'noiseless',
		options:	{
			type:		'ma',
			period:		24
		},
		sub:	[{
			type:		'delta',
			options:	{},
		},{
			type:		'normalize',
			options:	{
				min:	-1,
				max:	1,
				symmetry:true
			}
		}]
	},{
		name:		'diff',
		type:		'noiseless',
		options:	{
			type:		'ma',
			period:		12
		},
		sub:	[{
			type:		'diff',
			options:	{
				type:		'lag',
				propA:		'c',
				propB:		'$this'
			},
		}, {
			type:		'normalize',
			options:	{
				min:	-1,
				max:	1,
				symmetry:true
			}
		}]
	},{
		name:		'polarity',
		type:		'ANDpolarity',
		options:	{
			propA:		'diff',
			propB:		'fma_delta'
		},
		sub:	[{
			type:		'normalize',
			options:	{
				min:	-1,
				max:	1,
				symmetry:true
			}
		}]
	},{
		name:		'polarity2',
		type:		'ANDpolarity',
		options:	{
			propA:		'diff',
			propB:		'fma_delta',
		},
		sub:	[{
			type:		'normalize',
			options:	{
				min:	-1,
				max:	1,
				symmetry:true
			}
		}]
	}],
	charts:	[{
		data:	['c'],
		polarity:	{
			c:	'polarity'
		}
	},{
		data:	['polarity']
	},{
		data:	['fma_delta']
	},{
		data:	['diff']
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
