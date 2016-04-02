var hedgejs		= require('./hedgejs');
var chartLib 	= require('./chart');
var pstack 		= require('pstack');
var _ 			= require('underscore');

var hedge		= new hedgejs({});


var data	= {};

var symbols	= ['CURRENCY:EUR-USD'];

var stack	= new pstack();

_.each(symbols, function(symbol) {
	stack.add(function(done) {
		hedge.market.open(symbol);
		hedge.market.from(new Date(2015,1,01));
		hedge.market.to(new Date(2015,4,01));
		hedge.market.timeframe('hours');
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
		raw:	{
			width:		1920,
			height:		400,
			rect:		true,
			type:		'line',
			series:		{},
			polarity:	{}
		},
		transformed:	{
			width:	1920,
			height:	400,
			rect:	true,
			type:	'line',
			color:	{r:255,g:255,b:255,a:255},
			origin:	true,
			series:	{}
		},
		transformed2:	{
			width:	1920,
			height:	400,
			rect:	true,
			type:	'line',
			//color:	{r:255,g:255,b:255,a:255},
			//origin:	true,
			series:	{}
		}
	};
	
	_.each(symbols, function(symbol, n) {
		
		var dataset = data[symbol];
		
		
		dataset = hedge.transform.roofing(dataset, {
			rangeLow:	10,
			rangeHigh:	48,
			prop:		'c',
			propOut:	'r'
		});
		
		hedge.debug("dataset", dataset);
		
		// Main panels
		panels.raw.series[symbol]	= _.map(dataset, function(item) {
			return item.c;
		});
		panels.transformed.series[symbol]	= _.map(dataset, function(item) {
			return item.r;
		});
	});
	
	
	var chart = _.extend({
		filename:	'data/transform-ehler-roofing.png',
		width:		chartSize[0],
		height:		chartSize[1],
		charts:		[],
		slice:		50
	}, hedge.chart.vpanels([panels.raw, panels.transformed]));
	
	
	hedge.chart.render(chart);
});
