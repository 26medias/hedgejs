
var _ 				= require('underscore');
var chartLib 		= require('./chart');
var Rainbow			= require("./rainbow");
var pstack			= require('pstack');

var hedgejs = function(hedge, options) {
	this.options = _.extend({
		
	}, options);
	this.hedge	= hedge;
}
hedgejs.prototype.render = function(data, callback) {
	var scope = this;
	
	data	= _.extend({
		width:		400,
		height:		220,
		charts:		[],
		output:		'file',
		slice:		false,
		filename:	__dirname+'/data/merged.png'
	}, data);
	
	//console.log("Render",data);
	
	//this.hedge.debug("data", data);
	
	var blocks = [];
	
	// Prepare the colors
	
	var stack = new pstack({
		progress:	'Rendering...'
	});
	
	_.each(data.charts, function(chartData) {
		stack.add(function(done) {
			chartData	= _.extend({
				top:	0,
				left:	0,
				width:	data.width,
				height:	data.height,
				rect:	false,
				range:	{
					type:	'auto'
				},
				color:	{
					type:		'spectrum',
					spectrum:	['#000080', '#00FFFF', '#FFFF00', '#800000']
				}
			},chartData);
			
			var n = _.keys(chartData.series).length;
			
			if (chartData.color.type=='spectrum') {
				var rainbow	= new Rainbow();
				rainbow.setSpectrum.apply(null, chartData.color.spectrum);
			}
			
			switch (chartData.type) {
				default:
				case "lines":
					
					// Prepare the color spectrum
					if (chartData.color && chartData.color.type=='spectrum') {
						rainbow.setNumberRange(0,n>1?n:2);
					}
					
					// If there's a shared range, calculate it
					if (chartData.range && chartData.range.type=='sync') {
						chartData.range.min	= 100000;
						chartData.range.max	= -100000;
						
						_.each(chartData.series, function(dataset, name) {
							_.each(dataset, function(item) {
								if (item && item<chartData.range.min) {
									chartData.range.min = item;
								}
								if (item && item>chartData.range.max) {
									chartData.range.max = item;
								}
							})
						});
					}
					
					var c = 0;
					_.each(chartData.series, function(dataset, name) {
						
						var chartOptions = _.extend({},chartData);
						
						if (chartOptions.color && chartOptions.color.type=='spectrum') {
							console.log("chartOptions.color",chartOptions.color);
							chartOptions.color	= rainbow.rgbAt(c);
						}
						
						if (data.slice) {
							if (typeof data.slice=='number') {
								dataset	= dataset.slice(data.slice);
							}
						}
						
						var block = {
							top:	chartOptions.top,
							left:	chartOptions.left,
							chart:	scope.renderChart(dataset, chartOptions, name)
						};
						blocks.push(block);
						c++;
					});
				break;
				case "timeseries":
					chartData.series	= _.map(chartData.series, function(item) {
						return item[chartData.prop];
					});
					//scope.hedge.debug("chartData.series", chartData.series);
					var block = {
						top:	chartData.top,
						left:	chartData.left,
						chart:	scope.renderChart(chartData.series, {
							top:	chartData.top,
							left:	chartData.left,
							width:	chartData.width,
							height:	chartData.height
						})
					};
					blocks.push(block);
				break;
			}
			done();
		});
	});
	
	stack.add(function(done) {
		// Merge the charts
		var chart = new chartLib({
			width:	data.width,
			height:	data.height
		});
		chart.init();
		chart.fill({
			top:	0,
			left:	0,
			width:	data.width,
			height:	data.height,
			color:	{
				r:	0,
				g:	0,
				b:	0,
				a:	255
			}
		});
		chart.merge(blocks);
	
		_.each(data.charts, function(chartData) {
			
			if (chartData.rect) {
				chart.rect({
					top:	chartData.top,
					left:	chartData.left,
					width:	chartData.width,
					height:	chartData.height
				}, {
					r:	255,
					g:	255,
					b:	255,
					a:	255
				});
			}
		});
		
		switch (data.output) {
			case "file":
				chart.export(data.filename, function(filename) {
					console.log("exported:",filename);
				});
			break;
			case "base64":
				chart.toBase64String(function(base64) {
					console.log("exported:",base64);
				});
			break;
		}
		
		done();
	});
	
	stack.start(function() {
		
	});
	
	
	//console.log("blocks",blocks);
}
hedgejs.prototype.vpanels = function(charts, options) {
	options = _.extend({
		padding:	5
	}, options);
	
	var width	= 0;
	var height	= options.padding;
	var top		= options.padding;
	var left	= options.padding;
	
	charts	= _.map(charts, function(chart) {
		chart.top	= top;
		chart.left	= left;
		height		+= chart.height+options.padding;
		top			+= chart.height;
		
		if (chart.width > width) {
			width = chart.width;
		}
		
		chart.width		-= options.padding*2;
		chart.height	-= options.padding;
		
		return chart;
	});
	
	return {
		width:	width,
		height:	height,
		charts: charts
	};
}
hedgejs.prototype.renderChart = function(data, options, name) {
	options = _.extend({
		width:	800,
		height:	300
	}, options);
	
	//console.log("options",_.keys(options));
	
	switch (options.input) {
		case "dataseries":
			data	= _.map(data, function(item) {
				return item[options.prop];
			});
		break;
	}
	
	var chart = new chartLib(options);
	chart.init();
	
	
	
	if (options.origin) {
		if (options.range && options.range.min && options.range.max) {
			// Draw the X origin line
			var yOrigin = chart.map(0, options.range.min, options.range.max, chart.options.height-1, 0);
			chart.line(0,yOrigin,chart.options.width-1,yOrigin, {
				color:	{
					r:	255,
					g:	255,
					b:	255,
					a:	100
				}
			});
		} else {
			var yOrigin = chart.map(0, _.min(data), _.max(data), chart.options.height-1, 0);
			chart.line(0,yOrigin,chart.options.width-1,yOrigin, {
				color:	{
					r:	255,
					g:	255,
					b:	255,
					a:	100
				}
			});
		}
	}
	
	
	chart.renderLineChart(data, {
		range:		options.range,
		color:		options.color&&options.color?options.color:false,
		polarity:	options.polarity?options.polarity[name]:false
	});
	
	// Export
	if (options.filename) {
		chart.export(options.filename, function(filename) {
			console.log("exported:",filename);
			return true;
		});
	}
	
	return {
		width:	options.width,
		height:	options.height,
		pixels:	chart.pixels
	};
	
	//this.hedge.debug("chart", chart.pixels);
}
module.exports = hedgejs;
