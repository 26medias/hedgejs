# hedgejs #

Financial data analysis and prototyping.

Various tools available to explore, transform and chart the data (charting written in pure server-side JS, easy to extend)

## Demos ##

### Moving average of noiseless data ###
	hedge.market.open('AAPL');
	hedge.market.from(new Date(2013,0,01));
	hedge.market.to(new Date(2013,11,31));
	hedge.market.timeframe('daily');
	hedge.market.fetch(function(data) {
		
		
		var chart	= {
			data:	{
				top:	5,
				left:	5,
				width:	790,
				height:	195,
				type:	'line',
				rect:	true,
				series:	{}
			},
			noiseless:	{
				top:	200,
				left:	5,
				width:	790,
				height:	195,
				type:	'line',
				rect:	true,
				series:	{}
			},
		};
		
		chart.data.series['original'] = _.map(data, function(item) {
			return item.c;
		});
		
		
		chart.noiseless.series['noiseless'] = _.map(hedge.transform.noiseless(data, {
			period:	45,
			type:	'ma'
		}), function(item) {
			return item._c;
		});
		
		chart.noiseless.series['noise'] = _.map(hedge.transform.noise(data, {
			period:	45,
			type:	'ma'
		}), function(item) {
			return item._c;
		});
		
		chart.noiseless.series['avg'] = _.map(hedge.transform.noiseless(data, {
			level:	30
		}), function(item) {
			return item._c;
		});
		
		
		hedge.chart.render({
			filename:	'data/AAPL-noiseless-avg.png',
			width:		800,
			height:		400,
			charts:		[chart.data, chart.noiseless]
		});
	});


### Noise removal using moving averages ###
	hedge.market.open('AAPL');
	hedge.market.from(new Date(2013,0,01));
	hedge.market.to(new Date(2013,11,31));
	hedge.market.timeframe('daily');
	hedge.market.fetch(function(data) {
		
		
		var chart	= {
			top:	0,
			left:	0,
			width:	800,
			height:	200,
			type:	'line',
			series:	{}
		};
		
		chart.series['original'] = _.map(data, function(item) {
			return item.c;
		});
		
		chart.series['ma'] = _.map(hedge.transform.noiseless(data, {
			type:	'ma',
			period:	5
		}), function(item) {
			return item._c;
		});
		
		
		hedge.debug("chart", chart);
		
		
		hedge.chart.render({
			filename:	'data/AAPL-noiseless-ma.png',
			width:		800,
			height:		200,
			charts:		[chart]
		});
	});


### Noise removal, turning point detection based on hstdev ###
	hedge.market.open('CURRENCY:EUR-USD');
	hedge.market.from(new Date(2013,0,1));
	hedge.market.to(new Date(2015,11,31));
	hedge.market.timeframe('daily');
	hedge.market.fetch(function(data) {
		
		var chartObj = {
			filename:	'data/detrend-tp-eurusd2.png',
			width:		1920,
			height:		800
		};
		
		//hedge.debug("raw-data", data);
		//return false;
		var chart = {
			original:	{
				top:	5,
				left:	5,
				width:	chartObj.width-10,
				height:	(chartObj.height/4)-10,
				type:	'line',
				rect:	true,
				series:	{
					original: _.map(data, function(item) {
						return item.c;
					})
				}
			},
			noiseless:	{
				top:	(chartObj.height/4)*1+5,
				left:	5,
				width:	chartObj.width-10,
				height:	(chartObj.height/4)-10,
				rect:	true,
				type:	'line',
				series:	{}
			},
			noise:	{
				top:	(chartObj.height/4)*2+5,
				left:	5,
				width:	chartObj.width-10,
				height:	(chartObj.height/4)-10,
				rect:	true,
				type:	'line',
				series:	{}
			},
			noiseAvg:	{
				top:	(chartObj.height/4)*2+5,
				left:	5,
				width:	chartObj.width-10,
				height:	(chartObj.height/4)-10,
				rect:	false,
				type:	'line',
				series:	{}
			},
			noiseStd:	{
				top:	(chartObj.height/4)*3+5,
				left:	5,
				width:	chartObj.width-10,
				height:	(chartObj.height/4)-10,
				rect:	true,
				type:	'line',
				series:	{}
			}
		};
		
		var noiseBuffer = {};
		
		_.each(_.range(80,100,1), function(level) {
			
			// Remove the noise
			chart.noiseless.series[level] = _.map(hedge.transform.noiseless(data, {
				level:	level,
				period:	level,
				type:	'ma',
			}), function(item) {
				return item._c;
			});
			
			/// Remove the trend
			noiseBuffer[level]	= hedge.transform.noise(data, {
				level:	level,
				period:	level,
				type:	'ma',
			})
			chart.noise.series[level] = _.map(noiseBuffer[level], function(item) {
				return item._c;
			});
			
		});
		
		chart.noiseAvg.series['ma'] = _.map(hedge.transform.noiseless(noiseBuffer[100], {
			type:	'ma',
			period:	30
		}), function(item) {
			return item._c;
		});
		
		
		// Calculate the vertical stdev of the series
		chart.noiseStd.series['stdev'] = hedge.transform.hstdev(chart.noise.series);//@TODO: hstdev()
		
		
		//hedge.debug("chart", chart);
		//hedge.debug("hstdev", hedge.transform.hstdev(chart.noise.series));
		
		
		
		chartObj.charts = [chart.original,chart.noiseless,chart.noise,chart.noiseAvg,chart.noiseStd];
		hedge.chart.render(chartObj, function(filename) {
			scope.hedge.airbase.image('noiseless', filename);
		});
	});


### Remove the noise ###
	hedge.market.open('AAPL');
	hedge.market.from(new Date(2013,0,01));
	hedge.market.to(new Date(2013,11,31));
	hedge.market.timeframe('daily');
	hedge.market.fetch(function(data) {
		
		
		var chart	= {
			top:	0,
			left:	0,
			width:	800,
			height:	200,
			type:	'line',
			series:	{}
		};
		
		chart.series['original'] = _.map(data, function(item) {
			return item.c;
		});
		
		
		_.each(_.range(1,100,5), function(level) {
			chart.series[level] = _.map(hedge.transform.noiseless(data, {
				level: level
			}), function(item) {
				return item._c;
			});
		});
		
		
		hedge.debug("chart", chart);
		
		
		hedge.chart.render({
			width:	800,
			height:	200,
			charts:	[chart]
		});
	});


### Delta Spectrum ###
	var data	= {};
	
	var symbols	= ['CURRENCY:EUR-USD','CURRENCY:EUR-NZD'];
	
	var stack	= new pstack();
	
	_.each(symbols, function(symbol) {
		stack.add(function(done) {
			hedge.market.open(symbol);
			hedge.market.from(new Date(2013,0,01));
			hedge.market.to(new Date(2015,11,31));
			hedge.market.timeframe('daily');
			hedge.market.fetch(function(response) {
				data[symbol]				= response;
				done();
			});
		});
	});
	
	
	stack.start(function() {
		/*var correlation = hedge.correlation.correlate(data, {
			prop:	'c'
		});
		
		console.log("Correlation delay:",_.min(correlation, function(item) {
			return Math.abs(item.r);
		}));
		
		hedge.debug("correlation", correlation);
		*/
		
		
		
		var chart	= {
			data:	{
				top:	5,
				left:	5,
				width:	790,
				height:	195,
				type:	'line',
				rect:	true,
				series:	{}
			},
			noiseless:	{
				top:	200,
				left:	5,
				width:	790,
				height:	195,
				type:	'line',
				rect:	true,
				series:	{}
			},
			symbols:	[]
		};
		
		_.each(symbols, function(symbol, n) {
			chart.data.series[symbol] = _.map(data[symbol], function(item) {
				return item.c;
			});
			
			chart.noiseless.series[symbol] = _.map(hedge.transform.noise(data[symbol], {
				type:	'ma',
				period:	'10'
			}), function(item) {
				return item._c;
			});
			
			
			var bufferSeries = {};
			
			_.each(_.range(1,15,1), function(period) {
				bufferSeries[symbol+'-'+period] = _.map(hedge.transform.delta(data[symbol], {
					type:	'ma',
					period:	period
				}), function(item) {
					return item._c;
				});
			});
			
			// Save the chart
			chart.symbols.push({
				top:	400+(200*n),
				left:	5,
				width:	790,
				height:	195,
				type:	'line',
				rect:	true,
				series:	bufferSeries,
				range:	{
					type:	'sync'
				}
			});
			
		});
		
		var chartList = [chart.data, chart.noiseless];
		_.each(chart.symbols, function(item, n) {
			//hedge.debug("item-"+n, item);
			chartList.push(item);
		});
		
		//hedge.debug("chartList", chartList);
		
		hedge.chart.render({
			filename:	'data/delta-ma.png',
			width:		800,
			height:		800,
			charts:		chartList
		});
	});

### Delta Spectrum, hstdev and hmean ###

	var hedgejs		= require('./hedgejs');
	var chartLib 	= require('./chart');
	var pstack 		= require('pstack');
	var _ 			= require('underscore');
	
	var hedge		= new hedgejs({});
	
	
	var data	= {};
	
	//var symbols	= ['CURRENCY:CAD-JPY','CURRENCY:EUR-USD','CURRENCY:EUR-NZD','CURRENCY:EUR-CAD'];
	var symbols	= ['CURRENCY:EUR-CHF'];
	
	var stack	= new pstack();
	
	_.each(symbols, function(symbol) {
		stack.add(function(done) {
			hedge.market.open(symbol);
			hedge.market.from(new Date(2015,2,01));
			hedge.market.to(new Date());
			hedge.market.timeframe('daily');
			hedge.market.fetch(function(response) {
				data[symbol]				= response;
				done();
			});
		});
	});
	
	
	stack.start(function() {
		
		var charts		= [];
		var chartSize	= [1200,800];
		
		_.each(symbols, function(symbol, n) {
			
			
			// Create the delta spectrum chart
			var bufferSeries = {};
			
			_.each(_.range(3,60,1), function(period) {
				bufferSeries[symbol+'-'+period] = _.map(hedge.transform.delta(data[symbol], {
					type:	'ma',
					period:	period
				}), function(item) {
					return item._c;
				});
			});
			
			charts.push({
				top:	(chartSize[1]*n)+5,
				left:	5,
				width:	chartSize[0]-10,
				height:	chartSize[1]*0.70-10,
				type:	'line',
				rect:	true,
				series:	bufferSeries,
				range:	{
					type:	'sync'	// All charts must share the same min/max range
				}
			});
			
			// Add the raw data as overlay
			charts.push({
				top:	(chartSize[1]*n)+5,
				left:	5,
				width:	chartSize[0]-10,
				height:	chartSize[1]*0.70-10,
				rect:	true,
				type:	'line',
				color:	{r:216,g:17,b:89,a:255},
				series:	{
					raw:	_.map(data[symbol], function(item) {
						return item.c;
					})
				}
			});
			
			// Add the hstdev
			charts.push({
				top:	(chartSize[1]*n)+chartSize[1]*0.70+5,
				left:	5,
				width:	chartSize[0]-10,
				height:	chartSize[1]*0.15-10,
				rect:	true,
				type:	'line',
				color:	{r:216,g:17,b:89,a:255},
				origin:	true,
				series:	{
					hstdev:	hedge.transform.hstdev(bufferSeries, {})
				}
			});
			
			// Add the hmean
			charts.push({
				top:	(chartSize[1]*n)+chartSize[1]*0.85+5,
				left:	5,
				width:	chartSize[0]-10,
				height:	chartSize[1]*0.15-10,
				rect:	true,
				type:	'line',
				color:	{r:255,g:188,b:66,a:255},
				origin:	true,
				series:	{
					hstdev:	hedge.transform.hmean(bufferSeries, {})
				}
			});
			
		});
		
		hedge.chart.render({
			filename:	'data/delta-ma-vs-4.png',
			width:		chartSize[0],
			height:		chartSize[1]*symbols.length,
			charts:		charts,
			slice:		60
		});
	});



### Delta comparison for correlation ###

	var hedgejs		= require('./hedgejs');
	var chartLib 	= require('./chart');
	var pstack 		= require('pstack');
	var _ 			= require('underscore');
	
	var hedge		= new hedgejs({});
	
	
	var data	= {};
	
	//var symbols	= ['CURRENCY:CAD-JPY','CURRENCY:EUR-USD','CURRENCY:EUR-NZD','CURRENCY:EUR-CAD'];
	var symbols	= ['CURRENCY:CAD-JPY','CURRENCY:EUR-USD','CURRENCY:EUR-NZD','CURRENCY:EUR-CAD', 'CURRENCY:EUR-CHF'/**/];
	
	var stack	= new pstack();
	
	_.each(symbols, function(symbol) {
		stack.add(function(done) {
			hedge.market.open(symbol);
			hedge.market.from(new Date(2015,2,01));
			hedge.market.to(new Date(2016,2,01));
			hedge.market.timeframe('daily');
			hedge.market.fetch(function(response) {
				data[symbol]				= response;
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
				width:	1200,
				height:	400,
				rect:	true,
				type:	'line',
				range:	{
					type:	'sync'
				},
				origin:	true,
				series:		{}
			},
			delta:	{
				width:	1200,
				height:	400,
				rect:	true,
				type:	'line',
				range:	{
					type:	'sync'
				},
				origin:	true,
				series:		{}
			},
			sdelta:	{
				width:	1200,
				height:	400,
				rect:	true,
				type:	'line',
				range:	{
					type:	'sync'
				},
				origin:	true,
				series:		{}
			},
			madelta:	{
				width:	1200,
				height:	400,
				rect:	true,
				type:	'line',
				range:	{
					type:	'sync'
				},
				origin:	true,
				series:		{}
			}
		};
		
		_.each(symbols, function(symbol, n) {
			var dataset = hedge.transform.standardize(data[symbol], {
				prop:		'c',
				propOut:	'std'
			});
			dataset	= hedge.transform.delta(dataset, {
				prop:		'std',
				propOut:	'delta'
			});
			dataset	= hedge.transform.delta(dataset, {
				type:		'lag',
				period:		5,
				prop:		'std',
				propOut:	'sdelta'
			});
			dataset	= hedge.transform.delta(dataset, {
				type:		'ma',
				period:		5,
				prop:		'std',
				propOut:	'madelta'
			});
			
			panels.standardized.series[symbol]	= _.map(dataset, function(item) {
				return item.std;
			});
			panels.delta.series[symbol]			= _.map(dataset, function(item) {
				return item.delta;
			});
			panels.sdelta.series[symbol]		= _.map(dataset, function(item) {
				return item.sdelta;
			});
			panels.madelta.series[symbol]		= _.map(dataset, function(item) {
				return item.madelta;
			});
		});
		
		var chart = _.extend({
			filename:	'data/standardized-all.png',
			width:		chartSize[0],
			height:		chartSize[1],
			charts:		[]
		}, hedge.chart.vpanels([panels.standardized, panels.delta, panels.sdelta, panels.madelta]));
		
		
		//hedge.debug("chart", chart);
		
		hedge.chart.render(chart);
	});


### Correlated trends ###

	var hedgejs		= require('./hedgejs');
	var chartLib 	= require('./chart');
	var pstack 		= require('pstack');
	var _ 			= require('underscore');
	
	var hedge		= new hedgejs({});
	
	
	var data	= {};
	
	var symbols	= ['CURRENCY:EUR-USD','CURRENCY:EUR-CAD','CURRENCY:EUR-NZD','CURRENCY:EUR-AUD'];
	
	var stack	= new pstack();
	
	_.each(symbols, function(symbol) {
		stack.add(function(done) {
			hedge.market.open(symbol);
			hedge.market.from(new Date(2015,1,01));
			hedge.market.to(new Date(2015,3,01));
			hedge.market.timeframe('hours');
			hedge.market.fetch(function(response) {
				data[symbol]				= response;
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
				width:	1920,
				height:	400,
				rect:	true,
				type:	'line',
				origin:	true,
				series:		{}
			},
			standardized1:	{
				width:	1920,
				height:	400,
				rect:	true,
				type:	'line',
				range:	{
					type:	'sync'
				},
				origin:	true,
				series:		{}
			},
			standardized2:	{
				width:	1920,
				height:	400,
				rect:	true,
				type:	'line',
				range:	{
					type:	'sync'
				},
				origin:	true,
				series:		{}
			},
			delta:	{
				width:	1920,
				height:	400,
				rect:	true,
				type:	'line',
				range:	{
					type:	'sync'
				},
				origin:	true,
				series:		{}
			},
			madelta:	{
				width:	1920,
				height:	400,
				rect:	true,
				type:	'line',
				range:	{
					type:	'sync'
				},
				origin:	true,
				series:		{}
			},
			std1_stats:	{
				width:	1920,
				height:	150,
				rect:	true,
				type:	'line',
				//color:	{r:216,g:17,b:89,a:255},
				range:	{
					type:	'sync'
				},
				origin:	true,
				series:		{}
			},
			std2_stats:	{
				width:	1920,
				height:	150,
				rect:	true,
				type:	'line',
				//color:	{r:216,g:17,b:89,a:255},
				range:	{
					type:	'sync'
				},
				origin:	true,
				series:		{}
			},
			delta_stats:	{
				width:	1920,
				height:	150,
				rect:	true,
				type:	'line',
				//color:	{r:216,g:17,b:89,a:255},
				range:	{
					type:	'sync'
				},
				origin:	true,
				series:		{}
			}
		};
		
		_.each(symbols, function(symbol, n) {
			
			var dataset = hedge.transform.noiseless(data[symbol], {
				type:		'ma',
				period:		3,
				prop:		'c',
				propOut:	'smooth'
			});
			dataset = hedge.transform.standardize(dataset, {
				prop:		'smooth',
				propOut:	'std1'
			});
			dataset = hedge.transform.standardize(dataset, {
				prop:		'smooth',
				type:		'rolling',
				period:		60,
				propOut:	'std2'
			});
			
			dataset	= hedge.transform.delta(dataset, {
				prop:		'std2',
				propOut:	'delta'
			});
			dataset	= hedge.transform.delta(dataset, {
				type:		'ma',
				period:		12,
				prop:		'std2',
				propOut:	'madelta'
			});
			
			// Main panels
			panels.raw.series[symbol]	= _.map(data[symbol], function(item) {
				return item.c;
			});
			panels.standardized1.series[symbol]	= _.map(dataset, function(item) {
				return item.std1;
			});
			panels.standardized2.series[symbol]	= _.map(dataset, function(item) {
				return item.std2;
			});
			panels.delta.series[symbol]			= _.map(dataset, function(item) {
				return item.delta;
			});
			panels.madelta.series[symbol]		= _.map(dataset, function(item) {
				return item.madelta;
			});
			
		});
		
		
		// Stats panels
		panels.std1_stats.series.mean		= hedge.transform.hmean(panels.standardized1.series, {});
		panels.std1_stats.series.stdev		= hedge.transform.hstdev(panels.standardized1.series, {});
		panels.std2_stats.series.mean		= hedge.transform.hmean(panels.standardized2.series, {});
		panels.std2_stats.series.stdev		= hedge.transform.hstdev(panels.standardized2.series, {});
		panels.delta_stats.series.mean		= hedge.transform.hmean(panels.madelta.series, {});
		panels.delta_stats.series.stdev		= hedge.transform.hstdev(panels.madelta.series, {});
		
		
		
		var chart = _.extend({
			filename:	'data/correlation-pair-rolling-std.png',
			width:		chartSize[0],
			height:		chartSize[1],
			charts:		[]
		}, hedge.chart.vpanels([panels.raw, panels.std1_stats, panels.std2_stats, panels.delta_stats, panels.standardized1, panels.standardized2, panels.madelta]));
		
		
		//hedge.debug("chart", chart);
		
		hedge.chart.render(chart);
	});


### Chart Polarity ###

	var hedgejs		= require('./hedgejs');
	var chartLib 	= require('./chart');
	var pstack 		= require('pstack');
	var _ 			= require('underscore');
	
	var hedge		= new hedgejs({});
	
	
	var data	= {};
	
	var symbols	= ['CURRENCY:EUR-USD','CURRENCY:EUR-CAD','CURRENCY:EUR-NZD','CURRENCY:EUR-AUD'];
	
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
			standardized:	{
				width:	1920,
				height:	400,
				rect:	true,
				type:	'line',
				//color:	{r:255,g:255,b:255,a:255},
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
				period:		24,
				prop:		'c',
				propOut:	'ma'
			});
			
			dataset = hedge.transform.standardize(dataset, {
				type:		'rolling',
				period:		100,
				prop:		'ma',
				propOut:	'std'
			});
			
			// Main panels
			panels.raw.series[symbol]	= _.map(dataset, function(item) {
				return item.c;
			});
			panels.standardized.series[symbol]	= _.map(dataset, function(item) {
				return item.std;
			});
			panels.raw.polarity[symbol]	= {
				positive:		{r:88,g:144,b:255,a:255},
				negative:		{r:216,g:17,b:89,a:255},
				data:			panels.standardized.series[symbol],
				threshold_pos:	_.max(panels.standardized.series[symbol])*0.1,
				threshold_neg:	_.min(panels.standardized.series[symbol])*0.1
			};
		});
		
		
		var chart = _.extend({
			filename:	'data/pair-chart-polarity.png',
			width:		chartSize[0],
			height:		chartSize[1],
			charts:		[]
		}, hedge.chart.vpanels([panels.raw, panels.standardized]));
		
		
		hedge.chart.render(chart);
	});
