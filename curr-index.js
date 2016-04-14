var hedgejs		= require('./hedgejs');
var chartLib 	= require('./chart');
var pstack 		= require('pstack');
var _ 			= require('underscore');

var hedge		= new hedgejs({});


var data	= {};

var symbols	= ['CURRENCY:EUR-CAD','CURRENCY:EUR-NZD','CURRENCY:EUR-AUD'];

var stack	= new pstack();

_.each(symbols, function(symbol) {
	stack.add(function(done) {
		hedge.market.open(symbol);
		hedge.market.from(new Date(2016,1,01));
		hedge.market.to(new Date(2016,2,01));
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


stack.start(function() {
	
	var charts		= [];
	var chartSize	= [1200,400];
	
	var panels = {
		standardized:	{
			width:	1920,
			height:	400,
			rect:	true,
			type:	'line',
			origin:	true,
			range:	{
				type:	'sync'
			},
			series:	{}
		}
	};
	
	_.each(symbols, function(symbol, n) {
		
		var dataset = data[symbol];
		
		
		dataset = hedge.transform.noiseless(dataset, {
			type:		'ma',
			period:		8,
			prop:		'c',
			propOut:	'ma'
		});
		
		dataset = hedge.transform.standardize(dataset, {
			type:		'rolling',
			period:		40,
			prop:		'ma',
			propOut:	'std'
		});
		
		panels.standardized.series[symbol]	= _.map(dataset, function(item) {
			return item.std;
		});
	});
	
	panels.standardized.series.hmean = hedge.transform.hmean(panels.standardized.series, {})
	
	
	var chart = _.extend({
		filename:	'data/curr-index.png',
		width:		chartSize[0],
		height:		chartSize[1],
		charts:		[]
	}, hedge.chart.vpanels([panels.standardized]));
	
	hedge.chart.render(chart, function() {});
});