var _ 			= require('underscore');
var fstool 		= require('fs-tool');
var hedgejs		= require('../hedgejs');
var hedge		= new hedgejs({});

var chart = function() {
	
}
chart.prototype.decode = function(input) {
	return JSON.parse(new Buffer(input, 'base64').toString('ascii'));
}
chart.prototype.encode = function(input) {
	return new Buffer(JSON.stringify(input)).toString('base64');
}
chart.prototype.run = function() {
	var scope		= this;
	var args		= this.args();
	
	// Load the data
	fstool.file.readJson('record-'+args.backtest+'.json', function(dataset) {
		scope.chart(dataset);
	});
}
chart.prototype.chart = function(dataset) {
	var scope		= this;
	var args		= this.args();
	
	var panels = {
		gen:	{
			width:		1920,
			height:		400,
			rect:		true,
			type:		'line',
			series:		{},
			polarity:	{},
			objects:	{}
		},
		gain:	{
			width:		1920,
			height:		400,
			rect:		true,
			type:		'line',
			series:		{},
			polarity:	{},
			objects:	{}
		},
		winRatio:	{
			width:		1920,
			height:		400,
			rect:		true,
			type:		'line',
			series:		{},
			polarity:	{},
			objects:	{}
		}
	};
	
	// Add the dataset data
	panels.gen.series.main = _.map(dataset, function(item) {
		return item.generation;
	});
	panels.gain.series.main = _.map(dataset, function(item) {
		return item.gainPct;
	});
	panels.winRatio.series.main = _.map(dataset, function(item) {
		return item.winRatio;
	});
	
	hedge.chart.render(_.extend({
		filename:	'backtest-'+args.backtest+'.png'
	}, hedge.chart.vpanels([panels.gen,panels.gain,panels.winRatio])), function() {
		
	});
}
chart.prototype.args = function() {
	var i;
	var args 	= process.argv.slice(2);
	var output 	= {};
	for (i=0;i<args.length;i++) {
		var l1	= args[i].substr(0,1);
		if (l1 == "-") {
			if (args[i+1] == "true") {
				args[i+1] = true;
			}
			if (args[i+1] == "false") {
				args[i+1] = false;
			}
			if (!isNaN(args[i+1]*1)) {
				args[i+1] = args[i+1]*1;
			}
			output[args[i].substr(1)] = args[i+1];
			i++;
		}
	}
	return output;
}


var c = new chart();
c.run();