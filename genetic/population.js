var _ 			= require('underscore');
var cprocess	= require('child_process');
var fstool 		= require('fs-tool');
var activetick 	= require('node-activetick');
var path 		= require('path');
var pstack 		= require('pstack');
var cliTable	= require('cli-table');

var population = function() {
	this.dnaScaffold	= {
		balance:	10000,
		leverage:	1,
		risk:		0.2,
		ts:			[1,5,false],
		smoothing:	[5,100,true],
		stdPeriod:	[5,100,true],
		rangePeriod:[5,100,true],
		trend:		[20,100,true]
	};
	this.defaultGenome = {
		balance:	10000,
		leverage:	1,
		risk:		0.2,
		ts:			1,
		smoothing:	14,
		stdPeriod:	14,
		rangePeriod:14,
		trend:		100
	}
	this.keys	= _.keys(this.defaultGenome);	// used for Key Generation
	this.population	= [];
	this.genomes	= {
		generation:		0,
		genomes:		[]
	};
	this.env	= {
		batch:			5,
		size:			this.args().size,
		mutationRate:	this.args().rate
	};
	this.backtest	= this.args().backtest;
	this.market		= new activetick({
		host:   '127.0.0.1',
    	port:   5000,
    	cache:	'file',
    	dir:	'../data'
	});
	this.datasetFile	= 'dataset-'+this.backtest+'.json';
	this.genomeFile		= 'genomes-'+this.backtest+'.json';
	this.genomeSort		= function(a,b) {
		return b.stats.gain-a.stats.gain;
	}
	
}
population.prototype.start = function() {
	var scope = this;
	
	var stack = new pstack();
	
	// Get the data
	stack.add(function(done) {
		console.log("Loading the dataset");
		fstool.file.exists(scope.datasetFile, function(exists) {
			if (exists) {
				done();
			} else {
				scope.market.open('CURRENCY:EUR-CAD');
				scope.market.from(new Date(2014,0,01));
				scope.market.to(new Date(2014,11,20));
				scope.market.timeframe('1h');
				scope.market.fetch(function(response) {
					fstool.file.writeJson(scope.datasetFile, response, function() {
						done();
						return true;
					}, true);
					return true;
				});
			}
			return true;
		});
	});
	
	// Get the known genomes
	stack.add(function(done) {
		console.log("Loading the known genomes");
		fstool.file.readJson(scope.genomeFile, function(genomes) {
			if (!genomes) {
				// No known genomes. We generate new ones.
				scope.generate();
				console.log("New genomes generated");
				done();
			} else {
				scope.genomes = genomes;
				// We use a random sample of the population
				scope.population	= _.map(_.sample(genomes.genomes, scope.env.size), function(genome) {
					var mutated 	= scope.mutate(genome.genome);
					mutated.id		= scope.genKey(mutated);
					mutated.parent	= genome.id;
					return mutated;
				});
				console.log("Genomes loaded");
				done();
			}
			return true;
		});
	});
	
	stack.start(function() {
		scope.intro();
		console.log("Evaluating the genomes...");
		scope.evaluatePopulation(function() {
			scope.topX(10);
		});
	});
	
}
population.prototype.intro = function() {
	var scope = this;
	console.log("-._    _.--'\"`'--._    _.--'\"`'--._    _.--'\"`'--._    ");
	console.log("'-:`.'|`|\"':-.  '-:`.'|`|\"':-.  '-:`.'|`|\"':-.  '.` : '");
	console.log("'.  '.  | |  | |'.  '.  | |  | |'.  '.  | |  | |'.  '.: ");
	console.log(": '.  '.| |  | |  '.  '.| |  | |  '.  '.| |  | |  '.  '");
	console.log("'   '.  `.:_ | :_.' '.  `.:_ | :_.' '.  `.:_ | :_.' '.  ");
	console.log("     `-..,..-'       `-..,..-'       `-..,..-'       `  ");
	console.log("--------------------------------------");
	console.log("Strategy:\t"+scope.backtest);
	console.log("Mutation Rate:\t"+(scope.env.mutationRate*100).toFixed(2)+'%');
	console.log("Population:\t"+scope.env.size);
	console.log("Batch:\t\t"+scope.env.batch);
	console.log("Generation:\t"+(scope.genomes.generation+1));
	console.log("Genomes:\t"+scope.genomes.genomes.length);
	console.log("--------------------------------------");
}
population.prototype.topX = function(n) {
	var scope = this;
	var table = new cliTable();
	
	console.log("");
	console.log("--------------------------------------");
	console.log("Top "+n+":");
	
	var row	= [];
	row.push('#');
	row.push('Gen');
	row.push('Gain');
	row.push('Win');
	row.push('Return');
	table.push(row);
	// Sort
	scope.genomes.genomes.sort(this.genomeSort);
	_.each(scope.genomes.genomes.slice(0,n), function(genome, n) {
		var row	= [];
		row.push('#'+(n+1));
		row.push(genome.generation);
		row.push(genome.stats.gainPct);
		row.push(genome.stats.pctWin);
		row.push((genome.stats.winRatio*100).toFixed(2)+'%');
		table.push(row);
	});
	
	console.log(table.toString());
}
population.prototype.chunk = function(array, chunkSize) {
	return [].concat.apply([],
        array.map(function(elem,i) {
            return i%chunkSize ? [] : [array.slice(i,i+chunkSize)];
        })
    );
}
population.prototype.evaluatePopulation = function(callback) {
	var scope = this;
	
	var stack = new pstack({
		progress:	'Evaluating...'
	});
	
	// Split into chunks
	var chunks = this.chunk(this.population, this.env.batch);
	
	_.each(chunks, function(chunk) {
		stack.add(function(done) {
			var substack = new pstack({
				progress:	false,
				async:		true
			});
			
			_.each(chunk, function(genome) {
				substack.add(function(subdone) {
					scope.evaluate(genome, function(stats) {
						var id = scope.genKey(genome);
						scope.genomes.genomes.push({
							id:			id,
							generation:	scope.genomes.generation+1,
							genome:		genome,
							stats:		stats
						});
						subdone();
					});
				});
			});
			
			substack.start(function() {
				done();
			});
		});
	});
	
	
	
	stack.start(function() {
		delete chunks;
		scope.saveGenomes();
		
		if (callback) {
			callback();
		}
	});
	
	return true;
}
population.prototype.saveGenomes = function(callback) {
	var scope = this;
	scope.genomes.genomes.sort(this.genomeSort);
	scope.genomes.generation++;
	scope.genomes.genomes	= scope.genomes.genomes.slice(0,3000);	// Keep the best 3000
	fstool.file.writeJson(scope.genomeFile, scope.genomes, function() {
		if (callback) {
			callback();
		}
	});
}
population.prototype.genKey = function(genome) {
	var output = [];
	_.each(this.keys, function(key) {
		output.push(genome[key].toString())
	});
	return output.join('-');
}
population.prototype.decode = function(input) {
	return JSON.parse(new Buffer(input, 'base64').toString('ascii'));
}
population.prototype.encode = function(input) {
	return new Buffer(JSON.stringify(input)).toString('base64');
}
population.prototype.generate = function() {
	var i;
	for (i=0;i<this.env.size;i++) {
		this.population.push(this.mutate(this.clone()));
	}
	//console.log(JSON.stringify(this.population, null, 4));
}
population.prototype.random = function(genome) {
	var genome = {};
	_.each(this.dnaScaffold, function(v,k) {
		switch (typeof v) {
			case "number":
				genome[k]	= v;
			break;
			case "object":
				genome[k]	= _.random.apply(this, v.slice(0,2));
				if (v[2]) {
					genome[k]	= Math.round(genome[k]);
				}
			break;
		}
		
	});
	
	return genome;
}
population.prototype.clone = function(genome) {
	var genome = {};
	_.each(this.defaultGenome, function(v,k) {
		genome[k]	= v;
	});
	return genome;
}
population.prototype.mutate = function(genome) {
	var scope	= this;
	var output	= {};
	_.each(genome, function(v,k) {
		if (typeof scope.dnaScaffold[k] == 'number') {
			output[k]	= scope.dnaScaffold[k];
		} else {
			var dir = _.sample([1,-1]);
			output[k]	= v+v*scope.env.mutationRate*dir;
			
			if (typeof scope.dnaScaffold[k] =='object' && scope.dnaScaffold[k][2]) {
				output[k]	= Math.round(output[k]);
				if (output[k] < scope.dnaScaffold[k][0]) {
					output[k] = scope.dnaScaffold[k][0];
				}
				if (output[k] > scope.dnaScaffold[k][1]) {
					output[k] = scope.dnaScaffold[k][1];
				}
			}
		}
	});
	return output;
}
population.prototype.evaluate = function(genome, callback) {
	var scope		= this;
	params	= [
		'thread',
		'-backtest',this.backtest,
		'-data',this.datasetFile,
		'-genome',this.encode(genome)
	];
	
	var instance	= cprocess.spawn('node', params);
	var stats;
	instance.stdout.on('data', function (data) {
		stats = data.toString('utf-8');
	});

	instance.stderr.on('data', function (data) {
		console.log("Error",data.toString('utf-8'));
	});
	
	instance.on('close', function (code, reason) {
		callback(scope.decode(stats));
	});
	
}
population.prototype.args = function() {
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


var p = new population();
p.start();