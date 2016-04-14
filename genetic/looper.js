var _ 			= require('underscore');
var cprocess	= require('child_process');
var fstool 		= require('fs-tool');
var activetick 	= require('node-activetick');
var path 		= require('path');
var pstack 		= require('pstack');
var cliTable	= require('cli-table');
var Duration	= require('duration');

var looper = function() {
	this.cycle	 = 0;
}
looper.prototype.start = function() {
	this.intro();
	
	var scope			= this;
	this.dataset		= [];
	this.backtest		= this.args().backtest;
	this.genomeFile		= 'genomes-'+this.backtest+'.json';
	this.recordFile		= 'record-'+this.backtest+'.json';
	
	fstool.file.readJson(scope.recordFile, function(record) {
		if (record) {
			scope.dataset	= record;
		}
		scope.run();
	});
}
looper.prototype.run = function(callback) {
	var scope		= this;
	
	var mutationRate	= _.random(1, 25)/100;
	
	params	= [
		'population',
		'-backtest',this.args().backtest,
		'-size',this.args().size,
		'-rate', mutationRate
	];
	
	var tStart = new Date();
	
	var instance	= cprocess.spawn('node', params);
	
	instance.stdout.on('data', function (data) {
		//stats = data.toString('utf-8');
	});

	instance.stderr.on('data', function (data) {
		//console.log("Error",data.toString('utf-8'));
	});
	
	instance.on('close', function (code, reason) {
		var tEnd		= new Date();
		var duration	= new Duration(tStart, tEnd);
		
		scope.cycle++;
		
		scope.recordDatapoint(function(bestGenome) {
			console.log('Cycle: '+scope.cycle+'\tDuration: '+duration.toString()+'\tMutation Rate: '+mutationRate.toFixed(2)+'\tBest: '+bestGenome.stats.gainPct);
			
			
			// Take a break, re-run
			setTimeout(function() {
				scope.run();
			}, 5000);
		});
		
	});
}
looper.prototype.intro = function() {
	var scope = this;
	console.log("-._    _.--'\"`'--._    _.--'\"`'--._    _.--'\"`'--._    ");
	console.log("'-:`.'|`|\"':-.  '-:`.'|`|\"':-.  '-:`.'|`|\"':-.  '.` : '");
	console.log("'.  '.  | |  | |'.  '.  | |  | |'.  '.  | |  | |'.  '.: ");
	console.log(": '.  '.| |  | |  '.  '.| |  | |  '.  '.| |  | |  '.  '");
	console.log("'   '.  `.:_ | :_.' '.  `.:_ | :_.' '.  `.:_ | :_.' '.  ");
	console.log("     `-..,..-'       `-..,..-'       `-..,..-'       `  ");
	console.log("--------------------------------------");
	console.log("Strategy:\t"+this.args().backtest);
	console.log("Population:\t"+this.args().size);
	console.log("Mutation Rate:\tRandom");
	console.log("--------------------------------------");
}
looper.prototype.recordDatapoint = function(callback) {
	var scope = this;
	
	// Read the genomes
	fstool.file.readJson(scope.genomeFile, function(genomes) {
		var genome = genomes.genomes[0];
		scope.dataset.push({
			d:			new Date(),
			generation:	genome.generation,
			gainPct:	parseFloat(genome.stats.gainPct),
			pctWin:		parseFloat(genome.stats.pctWin),
			winRatio:	parseFloat(genome.stats.winRatio),
			positions:	parseFloat(genome.stats.positions),
			avgWin:		parseFloat(genome.stats.avgWin),
			avgLoss:	parseFloat(genome.stats.avgLoss)
		});
		
		fstool.file.writeJson(scope.recordFile, scope.dataset, function(genomes) {
			callback(genome);
		}, true);
	});
	
}

looper.prototype.args = function() {
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


var l = new looper();
l.start();