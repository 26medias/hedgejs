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
		skip:		30,
		"balance":		10000,
        "leverage":		1,
        "risk":			0.2,
        "ts":			1,
        "smoothing":	8,
        "stdPeriod":	40,
        "rangePeriod":	16,
        "trend":		22,
		pCounter:		0
	}, settings);
	
	var charts		= [];
	var chartSize	= [1200,400];
	
	var panels = {
		raw:	{
			width:		1920,
			height:		400,
			rect:		true,
			type:		'line',
			series:		{},
			polarity:	{},
			objects:	{}
		},
		signal:	{
			width:		1920,
			height:		200,
			rect:		true,
			type:		'line',
			color:		{r:255,g:255,b:255,a:255},
			origin:		true,
			series:		{},
			polarity:	{},
			objects:	{}
		},
		std:	{
			width:		1920,
			height:		200,
			rect:		true,
			type:		'line',
			color:		{r:255,g:255,b:255,a:255},
			origin:		true,
			series:		{},
			polarity:	{},
			objects:	{}
		},
		confirm:	{
			width:		1920,
			height:		200,
			rect:		true,
			type:		'line',
			color:		{r:255,g:255,b:255,a:255},
			origin:		true,
			series:		{},
			polarity:	{},
			objects:	{}
		},
		filters:	{
			width:		1920,
			height:		200,
			rect:		true,
			type:		'line',
			origin:		true,
			series:		{},
			polarity:	{},
			objects:	{}
		},
		pCounter:	{
			width:		1920,
			height:		200,
			rect:		true,
			type:		'line',
			series:		{},
			polarity:	{},
			objects:	{}
		},
		stdev:	{
			width:		1920,
			height:		200,
			rect:		true,
			type:		'line',
			color:		{r:255,g:255,b:255,a:255},
			origin:		true,
			series:		{},
			polarity:	{},
			objects:	{}
		},
		backtest:	{
			balance:	{
				width:	1920,
				height:	200,
				rect:	true,
				type:	'line',
				series:	{},
				/*range:	{
					min:	0
				}*/
			},
			statsGains:	{
				width:	400,
				height:	200,
				rect:	true,
				type:	'frequencyRange',
				data:	{}
			},
			statsPct:	{
				width:	400,
				height:	200,
				rect:	true,
				type:	'frequencyRange',
				data:	{}
			},
			statsDurationWin:	{
				width:	400,
				height:	200,
				rect:	true,
				type:	'frequencyRange',
				data:	{}
			},
			statsDurationLose:	{
				width:	400,
				height:	200,
				rect:	true,
				type:	'frequencyRange',
				data:	{}
			}
		}
	};
	panels.raw.objects[symbol] = [];
	
		
	var dataset = data[symbol];
	
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
	// Polarity Counter
	dataset = hedge.transform.polarityCounter(dataset, {
		prop:		'polarity',
		propOut:	'pCounter'
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
	
	
	
	
	// Main panels
	panels.raw.series[symbol]			= _.map(dataset, function(item) {
		return item.c;
	});
	panels.raw.series[symbol+'trend']	= _.map(dataset, function(item) {
		return item.trend;
	});
	panels.confirm.series[symbol]	= _.map(dataset, function(item) {
		return item.confirm;
	});
	panels.std.series[symbol]	= _.map(dataset, function(item) {
		return item.std;
	});
	
	// AND Polarity Signal
	panels.signal.series[symbol]			= _.map(dataset, function(item) {
		return item.polarity;
	});
	
	// Filters components
	panels.filters.series[symbol+'delta']			= _.map(dataset, function(item) {
		return item.delta;
	});
	panels.filters.series[symbol+'diff']			= _.map(dataset, function(item) {
		return item.diff;
	});
	panels.pCounter.series[symbol]					= _.map(dataset, function(item) {
		return item.pCounter;
	});
	
	
	
	
	// Polarity
	panels.raw.polarity[symbol]	= {
		positive:		{r:88,g:144,b:255,a:255},
		negative:		{r:216,g:17,b:89,a:255},
		data:			panels.signal.series[symbol],
		threshold_pos:	0,
		threshold_neg:	0
	};
	panels.raw.polarity[symbol+'trend']	= {
		positive:		{r:88,g:144,b:255,a:255},
		negative:		{r:216,g:17,b:89,a:255},
		data:			panels.confirm.series[symbol],
		threshold_pos:	0,
		threshold_neg:	0
	};
	panels.signal.polarity[symbol]	= {
		positive:		{r:88,g:144,b:255,a:255},
		negative:		{r:216,g:17,b:89,a:255},
		data:			panels.signal.series[symbol],
		threshold_pos:	0,
		threshold_neg:	0
	};
	
	
	panels.pCounter.objects[symbol]	= [{
		type:	'hline',
		y:		settings.pCounter
	}];
	
	// Backtest
	var backtest = hedge.trader.backtest({
		rules:	{
			balance:	settings.balance,
			leverage:	settings.leverage
		},
		data:	{
			main:		data[symbol],	// Main data, mandatory
			std:		_.map(dataset, function(item) {
				return item.std;
			}),
			range:		_.map(dataset, function(item) {
				return item.range;
			}),
			polarity:	panels.signal.series[symbol],
			trend:		panels.confirm.series[symbol],
			pCounter:	panels.pCounter.series[symbol]
		},
		buffer:	{
			risk:		settings.risk,
			ts:			settings.ts,
			flags:		{},
			trigger:	{
				trigger:	0.7,
				range:		[0.5,0.7]
			},
			stdRange:	{
				min:	1000000,
				max:	-1000000
			}
		},
		trade:	function(n, data, buffer) {
			if (n>settings.skip) {
				if (data.polarity[n]>0 && data.polarity[n-1]<=0 && data.trend[n]>0 && data.pCounter[n-2]>=settings.pCounter) {
					this.closeAll('sell');
					this.buy({
						lots:	this.balance*buffer.risk,
						TS:		-data.range[n]*buffer.ts
					});
				}
				if (data.polarity[n]<0 && data.polarity[n-1]>=0 && data.trend[n]<0 && data.pCounter[n-2]>=settings.pCounter) {
					this.closeAll('buy');
					this.sell({
						lots:	this.balance*buffer.risk,
						TS:		data.range[n]*buffer.ts
					});
				}
			}
			
		}
	});
	
	var stats = backtest.stats();
	
	//console.log("Stats:\n---------\n",JSON.stringify(stats.metrics,null,4));
	
	// Chart the balance and profits
	//panels.backtest.balance.series.balance	= backtest.charts.balance;
	panels.backtest.balance.series.value	= backtest.charts.value;
	panels.backtest.statsGains.data			= stats.frequencies.gains;
	panels.backtest.statsPct.data			= stats.frequencies.pct;
	panels.backtest.statsDurationWin.data	= stats.frequencies.durationWin;
	panels.backtest.statsDurationLose.data	= stats.frequencies.durationLose;
	
	
	// Generate the positions
	panels.raw.objects[symbol]		= backtest.getObjects();
	
	
	var exportStack = new pstack({
		progress:	'Exporting the charts...'
	});
	
	var buffer = {};
	
	exportStack.add(function(done) {
		fstool.directory.mkdir(__dirname, '/data/backtest/'+symbol.replace(':','-'), function(dirname) {
			buffer.dirname	= dirname;
			done();
		});
	});
	
	// Export the position frequency analysis
	exportStack.add(function(done) {
		hedge.chart.render(_.extend({
			filename:	buffer.dirname+'/frequencies.png'
		}, hedge.chart.vpanels([
			panels.backtest.statsGains,
			panels.backtest.statsPct,
			panels.backtest.statsDurationWin,
			panels.backtest.statsDurationLose
		])), function() {
			done();
		});
	});
	
	// Export the backtest output
	exportStack.add(function(done) {
		hedge.chart.render(_.extend({
			filename:	buffer.dirname+'/backtest.png',
		}, hedge.chart.vpanels([
			panels.raw,
			panels.std,
			panels.confirm,
			panels.signal,
			panels.filters,
			panels.backtest.balance
		])), function() {
			done();
		});
	});
	
	// Save the backtest stats
	exportStack.add(function(done) {
		fstool.file.writeJson(buffer.dirname+'/backtest.json', stats.metrics, function() {
			done();
		});
	});
	
	// Done, cleanup
	exportStack.start(function() {
		callback(stats.metrics);
		
		// Delete the data
		delete dataset;
		delete data[symbol];
		delete hedge;
		delete stats;
		return true;
	});
	
	return true;
}


_.each(symbols, function(symbol) {
	stack.add(function(done) {
		var hedge		= new hedgejs({});
		hedge.market.open(symbol);
		hedge.market.from(new Date(2014,0,01));
		hedge.market.to(new Date(2014,11,20));
		hedge.market.timeframe('1h');
		hedge.market.fetch(function(response) {
			data[symbol]	= response;
			
			sim(symbol, {}, function(response) {
				stats.push({
					symbol:		symbol,
					gain:		response.gainPct,
					pctWin:		response.pctWin,
					avgWin:		response.avgWin,
					avgLoss:	response.avgLoss,
					winRatio:	response.winRatio
				});
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
	stats.sort(function(a,b) {
		return parseFloat(b.gain)-parseFloat(a.gain);
	});
	console.log(JSON.stringify(stats, null, 4));
});
