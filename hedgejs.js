
var _ 				= require('underscore');
var activetick 		= require('node-activetick');
var fstool 			= require('fs-tool');
var airbase 		= require('airbase');

var hedgejs = function(options) {
	this.options = _.extend({
		activetick: {
			host:   '127.0.0.1',
	    	port:   5000,
	    	cache:	'file',
	    	dir:	'data'
		}
	}, options);
	
	this.market		= new activetick(this.options.activetick);
	
	this.airbase	= new airbase();
	
	this.modules	= ['transform','chart','correlation'];
	
	// Load the modules
	this.init();
}
hedgejs.prototype.init = function() {
	var scope = this;
	
	_.each(this.modules, function(module) {
		var lib			= require('./hedge.'+module);
		scope[module]	= new lib(scope, scope.options);
	});
	
	return this;
}
hedgejs.prototype.debug = function(name, data) {
	fstool.file.writeJson('data/debug.'+name+'.json', data, function() {});
}
module.exports = hedgejs;
