var hedgejs		= require('./hedgejs');
var chartLib 	= require('./chart');
var pstack 		= require('pstack');
var fstool 		= require('fs-tool');
var _ 			= require('underscore');

var data	= {};

var symbols	= ['CURRENCY:EUR-CAD'/*, 'CURRENCY:EUR-USD', 'CURRENCY:EUR-CHF', 'CURRENCY:EUR-GBP'*/];

var stack	= new pstack({
	async:	false
});

var stats	= [];


var sim = function(symbol, settings, callback) {
	
	var hedge		= new hedgejs({});
	
	settings	= _.extend({
        smoothing:		4,
        trend:			40,
        stdPeriod:		20,
        stdSmoothing:	10
	}, settings);
	
	var charts		= [];
	var chartSize	= [1200,400];
	
	var panels = {
		raw:	{
			width:		1920,
			height:		400,
			rect:		true,
			type:		'line',
			color:	{
				type:		'spectrum',
				spectrum:	['#00FFFF', '#FFFF00', '#800000']
			},
			series:		{},
			polarity:	{},
			objects:	{}
		},
		std:	{
			width:		1920,
			height:		200,
			rect:		true,
			type:		'line',
			origin:		true,
			series:		{},
			color:	{
				type:		'spectrum',
				spectrum:	['#00FFFF', '#FFFF00', '#800000']
			},
			polarity:	{},
			objects:	{}
		}
	};
	panels.std.objects[symbol] = [{
		type:	'hline',
		y:		0.2
	}];
	
		
	var dataset = data[symbol];
	
	// Smoothed price
	dataset = hedge.transform.noiseless(dataset, {
		type:		'ma',
		prop:		'c',
		propOut:	'ma',
		period:		settings.smoothing
	});
	
	// Trend
	dataset = hedge.transform.noiseless(dataset, {
		type:		'ma',
		prop:		'c',
		propOut:	'trend',
		period:		settings.trend
	});
	
	// Stochastic Standardization
	dataset = hedge.transform.standardize(dataset, {
		type:		'rolling',
		prop:		'c',
		propOut:	'std',
		period:		settings.stdPeriod
	});
	dataset = hedge.transform.normalize(dataset, {
		prop:		'std',
		propOut:	'std',
		period:		2,
		min:		-1,
		max:		1,
		symmetry:	true
	});
	
	
	// Moving Average
	dataset = hedge.transform.noiseless(dataset, {
		type:		'ma',
		prop:		'std',
		propOut:	'stdMa',
		period:		settings.stdSmoothing
	});
	
	// Main panels
	panels.raw.series[symbol]			= _.map(dataset, function(item) {
		return item.c;
	});
	panels.raw.series[symbol+'ma']	= _.map(dataset, function(item) {
		return item.ma;
	});
	panels.raw.series[symbol+'trend']	= _.map(dataset, function(item) {
		return item.trend;
	});
	panels.std.series[symbol+'std']		= _.map(dataset, function(item) {
		return item.std;
	});
	panels.std.series[symbol+'stdMa']	= _.map(dataset, function(item) {
		return item.stdMa;
	});
	
	
	var exportStack = new pstack({
		progress:	'Exporting the charts...'
	});
	
	var buffer = {};
	
	exportStack.add(function(done) {
		fstool.directory.mkdir(__dirname, '/data/signals/'+symbol.replace(':','-'), function(dirname) {
			buffer.dirname	= dirname;
			done();
		});
	});
	
	// Export the backtest output
	exportStack.add(function(done) {
		hedge.chart.render(_.extend({
			filename:	buffer.dirname+'/chart.png',
		}, hedge.chart.vpanels([
			panels.raw,
			panels.std
		])), function() {
			done();
		});
	});
	
	// Done, cleanup
	exportStack.start(function() {
		callback();
		
	});
	
	return true;
}


_.each(symbols, function(symbol) {
	stack.add(function(done) {
		var hedge		= new hedgejs({});
		hedge.market.open(symbol);
		hedge.market.from(new Date(2016,0,01));
		hedge.market.to(new Date(2016,2,20));
		hedge.market.timeframe('1h');
		hedge.market.fetch(function(response) {
			data[symbol]	= response;
			
			sim(symbol, {}, function(response) {
				done();
				
				delete hedge;
			});
			//done();
			return true;
		});
		return true;
	});
	return true;
});


stack.start(function() {
	console.log("Completed.");
});
