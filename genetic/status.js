var _ 			= require('underscore');
var cprocess	= require('child_process');
var fstool 		= require('fs-tool');
var activetick 	= require('node-activetick');
var path 		= require('path');
var pstack 		= require('pstack');
var cliTable	= require('cli-table');

var status = function() {
	this.backtest		= this.args().backtest;
	this.genomeFile		= 'genomes-'+this.backtest+'.json';
}
status.prototype.check = function() {
	var scope = this;
	
	var stack = new pstack();
	
	// Get the known genomes
	stack.add(function(done) {
		console.log("Loading the known genomes");
		fstool.file.readJson(scope.genomeFile, function(genomes) {
			if (!genomes) {
				console.log("No genomes found.");
				done();
			} else {
				scope.genomes = genomes;
				done();
			}
			return true;
		});
	});
	
	stack.start(function() {
		scope.intro();
		scope.topX(scope.args().count);
	});
}
status.prototype.intro = function() {
	var scope = this;
	console.log("-._    _.--'\"`'--._    _.--'\"`'--._    _.--'\"`'--._    ");
	console.log("'-:`.'|`|\"':-.  '-:`.'|`|\"':-.  '-:`.'|`|\"':-.  '.` : '");
	console.log("'.  '.  | |  | |'.  '.  | |  | |'.  '.  | |  | |'.  '.: ");
	console.log(": '.  '.| |  | |  '.  '.| |  | |  '.  '.| |  | |  '.  '");
	console.log("'   '.  `.:_ | :_.' '.  `.:_ | :_.' '.  `.:_ | :_.' '.  ");
	console.log("     `-..,..-'       `-..,..-'       `-..,..-'       `  ");
	console.log("--------------------------------------");
	console.log("Generation:\t"+(scope.genomes.generation+1));
	console.log("Genomes:\t"+scope.genomes.genomes.length);
}
status.prototype.topX = function(n) {
	var scope = this;
	var table = new cliTable();
	
	console.log("--------------------------------------");
	
	var row	= [];
	row.push('#');
	row.push('Gen');
	row.push('Gain');
	row.push('Win');
	row.push('Return');
	row.push('Positions');
	row.push('Avg Win');
	row.push('Avg Loss');
	table.push(row);
	// Sort
	//scope.genomes.genomes.sort(this.genomeSort);
	_.each(scope.genomes.genomes.slice(0,n), function(genome, n) {
		var row	= [];
		row.push('#'+(n+1));
		row.push(genome.generation);
		row.push(genome.stats.gainPct);
		row.push(genome.stats.pctWin);
		row.push((genome.stats.winRatio*100).toFixed(2)+'%');
		row.push(genome.stats.positions);
		row.push('$'+genome.stats.avgWin.toFixed(2));
		row.push('$'+genome.stats.avgLoss.toFixed(2));
		table.push(row);
	});
	
	console.log(table.toString());
}
status.prototype.args = function() {
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


var s = new status();
s.check();