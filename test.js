var hedgejs		= require('./hedgejs');
var chartLib 	= require('./chart');
var pstack 		= require('pstack');
var _ 			= require('underscore');

var hedge		= new hedgejs({});


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
