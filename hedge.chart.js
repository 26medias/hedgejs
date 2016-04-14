
var _ 				= require('underscore');
var chartLib 		= require('./chart');
var Rainbow			= require("./rainbow");
var pstack			= require('pstack');
var nunjucks		= require("nunjucks");
var path			= require("path");
var fstool			= require("fs-tool");

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
					spectrum:	['#8EC0E4', /*'#000080', */'#00FFFF', '#FFFF00', '#800000']
				}
			},chartData);
			
			var n = _.keys(chartData.series).length-1;
			
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
							//console.log("chartOptions.color",chartOptions.color);
							chartOptions.color.line	= rainbow.rgbAt(c);
						} else {
							chartOptions.color.line = chartOptions.color;
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
				case "frequencyRange":
					var block = {
						top:	chartData.top,
						left:	chartData.left,
						chart:	scope.renderFrequencyChart(chartData.data, chartData, false)
					};
					blocks.push(block);
					c++;
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
					//console.log("exported:",filename);
					callback(filename);
				});
			break;
			case "base64":
				chart.toBase64String(function(base64) {
					//console.log("exported:",base64);
					callback(base64);
				});
			break;
		}
		
		done();
	});
	
	stack.start(function() {
		
	});
	
	
	//console.log("blocks",blocks);
}
hedgejs.prototype.renderFrequencyChart = function(data, options) {
	options = _.extend({
		width:	800,
		height:	300
	}, options);
	
	var chart = new chartLib(options);
	chart.init();
	
	var viewport = chart.renderFrequencyChart(data, {});
	
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
	
	//console.log("range",options.range);
	
	var viewport = chart.renderLineChart(data, {
		range:		options.range,
		color:		options.color&&options.color?options.color:false,
		polarity:	options.polarity?options.polarity[name]:false
	});
	
	//console.log("range",options.range);
	
	
	if (options.objects && options.objects[name]) {
		//console.log("options.objects["+name+"]",options.objects[name]);
		_.each(options.objects[name], function(object) {
			switch (object.type) {
				case "line":
					object	= _.extend({
						color:	{
							r:	255,
							g:	255,
							b:	255,
							a:	200
						}
					}, object);
					
					chart.line(
						viewport.toX(object.coords[0]),
						viewport.toY(object.coords[1]),
						viewport.toX(object.coords[2]),
						viewport.toY(object.coords[3]),
						{color:object.color}
					);
				break;
				case "SL":
					object	= _.extend({
						color:	{
							r:	206,
							g:	26,
							b:	30,
							a:	200
						}
					}, object);
					
					chart.line(
						viewport.toX(object.from),
						viewport.toY(object.value),
						viewport.toX(object.from+object.length),
						viewport.toY(object.value),
						{color:object.color}
					);
				break;
				case "vline":
					object	= _.extend({
						color:	{
							r:	255,
							g:	255,
							b:	255,
							a:	50
						}
					}, object);
					
					chart.line(
						viewport.toX(object.x),
						viewport.toY(options.range.min),
						viewport.toX(object.x),
						viewport.toY(options.range.max),
						{color:object.color}
					);
				break;
				case "hline":
					object	= _.extend({
						color:	{
							r:	255,
							g:	255,
							b:	255,
							a:	150
						}
					}, object);
					
					chart.line(
						viewport.toX(0),
						viewport.toY(object.y),
						viewport.toX(data.length),
						viewport.toY(object.y),
						{color:object.color}
					);
				break;
				case "TP":
					object	= _.extend({
						color:	{
							r:	135,
							g:	203,
							b:	81,
							a:	200
						}
					}, object);
					
					chart.line(
						viewport.toX(object.from),
						viewport.toY(object.value),
						viewport.toX(object.from+object.length),
						viewport.toY(object.value),
						{color:object.color}
					);
				break;
				case "mark-up":
					object	= _.extend({
						color:	{
							r:	135,
							g:	203,
							b:	81,
							a:	200
						}
					}, object);
					
					chart.line(
						viewport.toX(object.x),
						viewport.toY(options.range.max),
						viewport.toX(object.x),
						viewport.toY(object.y),
						{color:object.color}
					);
				break;
				case "mark-down":
					object	= _.extend({
						color:	{
							r:	135,
							g:	203,
							b:	81,
							a:	200
						}
					}, object);
					
					chart.line(
						viewport.toX(object.x),
						viewport.toY(object.y),
						viewport.toX(object.x),
						viewport.toY(options.range.min),
						{color:object.color}
					);
				break;
			}
		});
	}
	
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
hedgejs.prototype.vpanels = function(charts, props, options) {
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
	
	return _.extend(props,{
		width:	width,
		height:	height,
		charts: charts
	});
}
hedgejs.prototype.build = function(data, options, callback) {
	var scope = this;
	options = _.extend({
		
	}, options);
	
	var stack = new pstack();
	
	_.each(data, function(dataset, name) {
		
		stack.add(function(done) {
			var filename 	= nunjucks.renderString(options.output, {
				name:	name
			});
			filename		= filename.replace(new RegExp(':','gmi'),'-');
			
			var directory	= path.dirname(filename);
			filename		= path.normalize(__dirname+'/'+filename);
			
			//console.log(">",directory,filename);
			var ranges = {};
			
			// Transform the data
			_.each(options.transforms, function(transform) {
				ranges[transform.name]	= [];
				
				if (transform.range) {
					var c = 0;
					var propRange = {};
					_.each(transform.range, function(v,k) {
						
						_.each(_.range(v[0],v[1]+(v[2]||1),v[2]||1), function(x) {
							
							propRange[k]	= x;
							var name		= transform.name+'-'+k+'-'+x;
							
							ranges[transform.name].push(name);
							
							var params = _.extend({
								propOut:	name
							}, transform.options, propRange);
							
							// Transform
							dataset = scope.hedge.transform[transform.type](dataset, params);
							
							if (transform.sub) {
								_.each(transform.sub, function(sub) {
									
									var params = _.extend({
										prop:		name,
										propOut:	'buffer'
									}, sub.options);
									
									_.each(params, function(p,pk) {
										if (p=='$this') {
											params[pk] = transform.name;
										}
									});
									var buffer = scope.hedge.transform[sub.type](dataset, params);
									
									// Re-merge
									dataset	= _.map(dataset, function(dataItem, n) {
										dataItem[name] = buffer[n]['buffer'];
										return dataItem;
									});
									
									delete buffer;
								});
							}
							
							c++;
						});
					});
				} else {
					dataset = scope.hedge.transform[transform.type](dataset, _.extend({
						propOut:	transform.name
					}, transform.options));
					
					if (transform.sub) {
						_.each(transform.sub, function(sub) {
							
							var params = _.extend({
								prop:		transform.name,
								propOut:	'buffer'
							}, sub.options);
							_.each(params, function(p,pk) {
								if (p=='$this') {
									params[pk] = transform.name;
								}
							});
							var buffer = scope.hedge.transform[sub.type](dataset, params);
							
							// Re-merge
							dataset	= _.map(dataset, function(dataItem, n) {
								dataItem[transform.name] = buffer[n]['buffer'];
								return dataItem;
							});
							
							delete buffer;
						});
					}
				}
			});
			
			
			if (options.slice) {
				dataset	= dataset.slice(options.slice);
			}
			
			
			//console.log(ranges);
			
			// Build the panels
			var panels = [];
			_.each(options.charts, function(chart) {
				var panel = {
					width:		options.width,
					height:		options.height,
					rect:		true,
					type:		'line',
					series:		{},
					polarity:	{},
					objects:	{}
				};
				_.each(chart.data, function(prop) {
					
					if (ranges[prop] && ranges[prop].length>0) {
						_.each(ranges[prop], function(rProp) {
							panel.series[rProp]			= _.map(dataset, function(item) {
								return item[rProp];
							});
							var range = {
								min:	Math.min.apply(this, panel.series[rProp]),
								max:	Math.max.apply(this, panel.series[rProp])
							};
							
							if (range.min <0 && range.max > 0) {
								panel.origin	= true;
							}
						});
					} else {
						panel.series[prop]			= _.map(dataset, function(item) {
							return item[prop];
						});
						var range = {
							min:	Math.min.apply(this, panel.series[prop]),
							max:	Math.max.apply(this, panel.series[prop])
						};
						
						if (range.min <0 && range.max > 0) {
							panel.origin	= true;
						}
					}
				});
				
				if (chart.polarity) {
					panel.polarity	= {};
					_.each(chart.polarity, function(v,k) {
						panel.polarity[k]	= {
							positive:		{r:88,g:144,b:255,a:255},
							negative:		{r:216,g:17,b:89,a:255},
							data:			_.map(dataset, function(item) {
								return item[v];
							}),
							threshold_pos:	0,
							threshold_neg:	0
						};
					});
					//scope.hedge.debug('panel', panel);
				}
				
				if (chart.range && chart.range=='sync') {
					panel.range = {
						type:	'sync'
					}
				}
				
				
				
				
				if (chart.objects) {
					console.log("Keys",_.keys(panel.series));
					var k	= _.keys(panel.series)[0];
					if (!panel.objects) {
						panel.objects = {};
					}
					panel.objects[k] = [];
					_.each(chart.objects, function(obj) {
						panel.objects[k].push(obj);
					});
				}
				
				//console.log(JSON.stringify(panel.objects, null,4));
				
				panels.push(panel);
			});
			
			//scope.hedge.debug('panels', panels);
			
			//console.log(JSON.stringify(panels, null,4));
			
			
			
			if (options.grid) {
				if (options.grid.x) {
					panels	= _.map(panels, function(panel) {
						if (!panel.objects) {
							panel.objects = {};
						}
						var k	= _.keys(panel.series)[0];
						if (!panel.objects[k]) {
							panel.objects[k] = [];
						}
						
						var i;
						var l = panel.series[k].length;
						for (i=0;i<l;i+=options.grid.x) {
							panel.objects[k].push({
								type:	'vline',
								x:		i
							});
						}
						
						return panel;
					});
				}
			}
			
			fstool.directory.mkdir(__dirname, directory, function(dir) {
				
				scope.render(scope.vpanels(panels, {
					filename:	filename
				}), function() {
					done();
				});
				
			});
			
		});
	});
	
	stack.start(function() {
		callback();
	});
}
module.exports = hedgejs;
