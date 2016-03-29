
var _ 				= require('underscore');
var chartLib 		= require('./chart');
var Rainbow			= require("./rainbow");

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
		filename:	__dirname+'/data/merged.png'
	}, data);
	
	//console.log("Render",data);
	
	//this.hedge.debug("data", data);
	
	var blocks = [];
	
	// Prepare the colors
	
	
	
	_.each(data.charts, function(chartData) {
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
					rainbow.setNumberRange(0,n);
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
					
					var chartOptions	= {
						top:	chartData.top,
						left:	chartData.left,
						width:	chartData.width,
						height:	chartData.height,
						range:	chartData.range
					};
					
					if (chartData.color && chartData.color.type=='spectrum') {
						chartOptions.color	= {
							fg:	rainbow.rgbAt(c),
							bg:	false,
						};
					}
					
					var block = {
						top:	chartData.top,
						left:	chartData.left,
						chart:	scope.renderChart(dataset, chartOptions)
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
		
	});
	
	//this.hedge.debug("blocks", blocks);
	
	// Merge the charts
	var chart = new chartLib({
		width:	data.width,
		height:	data.height
	});
	chart.init();
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
	
	
	
	
	//console.log("blocks",blocks);
}
hedgejs.prototype.renderChart = function(data, options) {
	options = _.extend({
		width:	800,
		height:	300
	}, options);
	
	switch (options.input) {
		case "dataseries":
			data	= _.map(data, function(item) {
				return item[options.prop];
			});
		break;
	}
	
	var chart = new chartLib(options);
	chart.init();
	chart.renderLineChart(data, {
		range:	options.range,
		color:	options.color&&options.color.fg?options.color.fg:false
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
