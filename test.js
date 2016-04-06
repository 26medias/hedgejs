var hedgejs		= require('./hedgejs');
var chartLib 	= require('./chart');
var pstack 		= require('pstack');
var _ 			= require('underscore');

var hedge		= new hedgejs({});


var data	= {};

var symbols	= ['CURRENCY:EUR-CAD'];

var stack	= new pstack();

_.each(symbols, function(symbol) {
	stack.add(function(done) {
		hedge.market.open(symbol);
		hedge.market.from(new Date(2015,0,01));
		hedge.market.to(new Date(2016,3,01));
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
		raw:	{
			width:		1920,
			height:		400,
			rect:		true,
			type:		'line',
			series:		{},
			polarity:	{},
			objects:	{}
		},
		range:	{
			width:		1920,
			height:		200,
			rect:		true,
			type:		'line',
			color:		{r:255,g:255,b:255,a:255},
			origin:		true,
			series:		{},
			objects:	{}
		},
		osc:	{
			width:		1920,
			height:		200,
			rect:		true,
			type:		'line',
			origin:		true,
			series:		{},
			objects:	{}
		},
		polarity:	{
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
		transformed:	{
			width:		1920,
			height:		400,
			rect:		true,
			type:		'line',
			color:		{r:255,g:255,b:255,a:255},
			origin:		true,
			series:		{},
			objects:	{}
		},
		backtest:	{
			balance:	{
				width:	6000,
				height:	200,
				rect:	true,
				type:	'line',
				series:	{},
				range:	{
					min:	0
				}
			},
			profits:	{
				width:	6000,
				height:	200,
				rect:	true,
				type:	'line',
				origin:	true,
				series:	{}
			}
		}
	};
	panels.raw.objects[symbols[0]] = [];
	
	_.each(symbols, function(symbol, n) {
		
		var dataset = data[symbol];
		
		// Moving Average
		dataset = hedge.transform.noiseless(dataset, {
			type:		'ma',
			prop:		'c',
			propOut:	'ma',
			period:		14,
		});
		// Moving Average Delta
		dataset = hedge.transform.delta(dataset, {
			type:		'lag',
			prop:		'ma',
			propOut:	'delta',
			period:		2
		});
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
			period:		14,
		});
		// Trading Range
		dataset = hedge.transform.range(dataset, {
			propOpen:	'o',
			propClose:	'c',
			propOut:	'range',
			period:		14
		});
		
		// Main panels
		panels.raw.series[symbol]			= _.map(dataset, function(item) {
			return item.c;
		});
		// Moving Average
		panels.raw.series[symbol+'ma']		= _.map(dataset, function(item) {
			return item.ma;
		});
		// Diff
		panels.osc.series[symbol+'diff']			= _.map(dataset, function(item) {
			return item.diff;
		});
		// Moving Average Delta
		panels.osc.series[symbol+'delta']			= _.map(dataset, function(item) {
			return item.delta;
		});
		// AND Polarity Signal
		panels.polarity.series[symbol]			= _.map(dataset, function(item) {
			return item.polarity;
		});
		
		// Average trading range
		panels.range.series[symbol]			= _.map(dataset, function(item) {
			return item.range;
		});
		// Stochastic Standardization
		panels.transformed.series[symbol]	= _.map(dataset, function(item) {
			return item.std;
		});
		
		// Polarity
		panels.raw.polarity[symbol]	= {
			positive:		{r:88,g:144,b:255,a:255},
			negative:		{r:216,g:17,b:89,a:255},
			data:			panels.polarity.series[symbol],
			threshold_pos:	0,//_.max(panels.transformed.series[symbol])*0.3,
			threshold_neg:	0//_.min(panels.transformed.series[symbol])*0.3
		};
		// Polarity
		panels.polarity.polarity[symbol]	= {
			positive:		{r:88,g:144,b:255,a:255},
			negative:		{r:216,g:17,b:89,a:255},
			data:			panels.polarity.series[symbol],
			threshold_pos:	0,//_.max(panels.transformed.series[symbol])*0.3,
			threshold_neg:	0//_.min(panels.transformed.series[symbol])*0.3
		};
	});
	
	hedge.debug('panels.raw', panels.raw);
	
	/*
	hedge.debug("backtest", {
		main:	data[symbols[0]],	// Main data, mandatory
		std:	panels.transformed.series[symbols[0]],
		range:	panels.range.series[symbols[0]]
	});
	*/
	
	// Backtest
	var backtest = hedge.trader.backtest({
		rules:	{
			balance:	100000,
			leverage:	20
		},
		data:	{
			main:		data[symbols[0]],	// Main data, mandatory
			std:		panels.transformed.series[symbols[0]],
			range:		panels.range.series[symbols[0]],
			polarity:	panels.polarity.series[symbols[0]]
		},
		buffer:	{
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
			if (n>20) {
				if (data.polarity[n]>0 && data.polarity[n-1]<=0) {
					this.buy({
						lots:	this.balance*0.3,
						TS:		-data.range[n]*1
					});
				}
				if (data.polarity[n]<0 && data.polarity[n-1]>=0) {
					this.sell({
						lots:	this.balance*0.3,
						TS:		data.range[n]*1
					});
				}
			}
			
		}
	});
	
	
	console.log("Stats:\n---------\n",JSON.stringify(backtest.stats(),null,4));
	
	//hedge.debug("backtest.charts", backtest.charts);
	
	// Chart the balance and profits
	panels.backtest.balance.series.balance	= backtest.charts.balance;
	panels.backtest.balance.series.value	= backtest.charts.value;
	panels.backtest.profits.series.profits	= backtest.charts.profits;
	
	hedge.debug("backtest.charts", backtest.charts);
	//hedge.debug("backtest.positions", backtest.positions);
	
	// Generate the positions
	_.each(backtest.positions, function(position) {
		//position.ended		-= 14;
		//position.started	-= 14;
		
		
		panels.raw.objects[symbols[0]].push({
			type:	'line',
			coords:	[position.started,position.entry,position.ended,position.exit]
		});
		
		
		// Add the objects
		if (position.TP) {
			panels.raw.objects[symbols[0]].push({
				type:	'TP',
				value:	position.TP,
				from:	position.started,
				length:	position.ended-position.started
			});
		}
		if (position.SL) {
			panels.raw.objects[symbols[0]].push({
				type:	'SL',
				value:	position.SL,
				from:	position.started,
				length:	position.ended-position.started
			});
		}
		if (position.TP && position.SL) {
			panels.raw.objects[symbols[0]].push({
				type:	'line',
				coords:	[position.started,Math.max(position.entry, position.exit),position.started,Math.min(position.entry, position.exit)]
			});
			panels.raw.objects[symbols[0]].push({
				type:	'line',
				coords:	[position.ended,Math.max(position.entry, position.exit),position.ended,Math.min(position.entry, position.exit)]
			});
			if (position.entry!=position.TP&&position.entry!=position.SL) {
				panels.raw.objects[symbols[0]].push({
					type:	'line',
					coords:	[position.started,position.entry,position.ended,position.entry]
				});
			}
		}
	});
	
	var chart = _.extend({
		filename:	'data/backtest-str-03.png',
		width:		chartSize[0],
		height:		chartSize[1],
		charts:		[],
		slice:		0
	}, hedge.chart.vpanels([/*panels.raw, panels.polarity, */panels.backtest.balance, panels.backtest.profits/*, panels.osc, panels.transformed, panels.backtest.balance, panels.backtest.profits*/]));
	
	
	hedge.chart.render(chart);
});
