var _ 			= require('underscore');
var fstool 		= require('fs-tool');

var thread = function() {
	
}
thread.prototype.decode = function(input) {
	return JSON.parse(new Buffer(input, 'base64').toString('ascii'));
}
thread.prototype.encode = function(input) {
	return new Buffer(JSON.stringify(input)).toString('base64');
}
thread.prototype.run = function() {
	var scope		= this;
	var args		= this.args();
	
	var backtest	 = require('./'+args.backtest);
	// Load the data
	fstool.file.readJson(args.data, function(dataset) {
		backtest(dataset, scope.decode(args.genome), function(stats) {
			console.log(scope.encode(stats));
			process.exit(1);
		});
	});
}
thread.prototype.args = function() {
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


var t = new thread();
t.run();