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