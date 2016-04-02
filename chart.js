
var _ 				= require('underscore');
var path			= require("path");
var fs				= require("fs");
var pstack			= require("pstack");
var png				= require("pngjs2").PNG;
var jpg				= require('pixel-jpg');
var jpgExport		= require('jpeg-js');
var gif				= require('pixel-gif');
var mime			= require("mime");
var shortid			= require("shortid");
var util			= require("util");
var fstool			= require("fs-tool");
var Rainbow			= require("./rainbow");

var chart = function(options) {
	this.options = _.extend({
		temp:		'./',
		width:		400,
		height:		200,
		color:	{
			bg:	false,
			fg:	{
				r:	218,
				g:	233,
				b:	244,
				a:	255
			}
		}
	}, options);
}
chart.prototype.init = function() {
	this.pixels	= new Uint32Array(this.options.width*this.options.height);
	
	if (this.options.color.bg) {
		this.fill({
			top:	0,
			left:	0,
			width:	this.options.width,
			height:	this.options.height,
			color:	this.options.color.bg
		});
	}
	
	return this;
}
chart.prototype.fill = function(options) {
	x = Math.round(options.left);
	y = Math.round(options.top);
	var i,j;
	for (i=y;i<y+options.height;i++) {
		for (j=x;j<x+options.width;j++) {
			this.setPixel(x+j,y+i, options.color, true);
		}
	}
	return this;
}
chart.prototype.rect = function(options, color) {
	var scope = this;
	var coords = [
		[options.left,options.top,options.left+options.width,options.top],
		[options.left+options.width,options.top,options.left+options.width,options.top+options.height],
		[options.left+options.width,options.top+options.height,options.left,options.top+options.height],
		[options.left,options.top+options.height,options.left,options.top]
	];
	//console.log("coords",coords);
	
	_.each(coords, function(coord) {
		scope.line(coord[0],coord[1],coord[2],coord[3], color||scope.options.color.fg);
	});
	return this;
}
chart.prototype.renderLineChart = function(data, options) {
	var scope = this;
	
	options = _.extend({
		color:	false	// auto
	}, options);
	
	//console.log("options",options);
	
	// Calculate the range, to map to the output range
	//var min = Math.min.apply(this, data);
	//var max = Math.max.apply(this, data);
	
	if (options.range && options.range.min) {
		var min = options.range.min;
	} else {
		var min = Math.min.apply(this, data);
	}
	if (options.range && options.range.max) {
		var max = options.range.max;
	} else {
		var max = Math.max.apply(this, data);
	}
	
	var spacing	= scope.options.width/(data.length-1);
	
	var coordinates	= _.map(data, function(item, n) {
		if (typeof item == 'number') {
			//console.log("  > ",item,scope.map(item, min, max, scope.options.height-1, 0));
			return [Math.ceil(spacing*n), Math.round(scope.map(item, min, max, scope.options.height-1, 0))];	// Normalized and y-inversed
		}
		return null;
	});
	
	//console.log("coordinates",coordinates);
	
	// Convert to x,y,xx,yy coords
	var i;
	var coords = [];
	var l = coordinates.length;
	for (i=0;i<l;i++) {
		if (coordinates[i] && coordinates[i+1]) {
			coords.push([coordinates[i][0], coordinates[i][1], coordinates[i+1][0], coordinates[i+1][1]]);
		}
	}
	
	// Render
	if (options.polarity) {
		
		options.polarity = _.extend({
			threshold_pos:	0,
			threshold_neg:	0
		}, options.polarity);
		
		var prevColor = false;
		_.each(coords, function(coord, n) {
			var opt	= _.extend({},options);
			if (n>=1) {
				if (options.polarity.data[n] > 0) {
					if (options.polarity.data[n] > options.polarity.threshold_pos) {
						opt.color	= options.polarity.positive;
					} else {
						opt.color	= prevColor?prevColor:options.color;
					}
				} else {
					if (options.polarity.data[n] < options.polarity.threshold_neg) {
						opt.color	= options.polarity.negative;
					} else {
						opt.color	= prevColor?prevColor:options.color;
					}
				}
				prevColor = opt.color;
			}
			scope.line(coord[0],coord[1],coord[2],coord[3], opt);
		});
	} else {
		_.each(coords, function(coord) {
			scope.line(coord[0],coord[1],coord[2],coord[3], options);
		});
	}
	
	
	return this;
}





chart.prototype._alpha = function(color,r) {
	//console.log("color:",color.a, r, color.a*r);
	return _.extend({},color, {
		a:	color.a*r
	});
}


chart.prototype.line = function(x1, y1, x2, y2, options) {
	
	options = _.extend({
		color:	this.options.color.fg
	}, options);
	
	
	_x1 = Math.round(Math.min(x1,x2));
	_x2 = Math.round(Math.max(x1,x2));
	//_y1 = Math.round(Math.min(y1,y2));
	//_y2 = Math.round(Math.max(y1,y2));
	
	x1 = _x1;
	x2 = _x2;
	//y1 = _y1;
	//y2 = _y2;
	
	//console.log("> line", x1, y1, x2, y2);
	
	var x,y,d,hd,h,yy1,high,low;
	var history = [];
	//console.log("for",x1,x2);
	if (x1==x2) {
		//console.log("vertical",y1,y2);
		_y1 = Math.round(Math.min(y1,y2));
		_y2 = Math.round(Math.max(y1,y2));
		y1 = _y1;
		y2 = _y2;
		for (y=y1;y<=y2;y++) {
			this.setPixel(x1, y, options.color);
			//console.log("   pix:",x1, y);
		}
	} else if (y1==y2) {
		//console.log("horizontal",x1,x2);
		for (x=x1;x<=x2;x++) {
			this.setPixel(x, y1, options.color);
			//console.log("   pix:",x, y1);
		}
	} else {
		for (x=x1;x<=x2;x++) {
			y	= y1+(((x-x1)*(y2-y1))/(x2-x1));
			// Set the pixel at the anchor point
			this.setPixel(x, Math.round(y), options.color);
			if (x>x1) {
				// Calculate the height between this point and the previous one
				yy1		= history[history.length-1]*1;
				d		= y-yy1;
				hd		= Math.round(d*0.9);
				if (hd < 0) {
					// Going up
					for (h=hd*-1;h>=1;h--) {
						this.setPixel(x-1, Math.round(yy1-h), this._alpha(options.color, 1-(h/(hd*-1+1))));
						this.setPixel(x, Math.round(y+h), this._alpha(options.color, 1-(h/(hd*-1+1))));
					}
				}
				if (hd > 0) {
					// Going up
					for (h=1;h<=hd;h++) {
						this.setPixel(x-1, Math.round(yy1+h), this._alpha(options.color, 1-(h/(hd+1))));
						this.setPixel(x, Math.round(y-h), this._alpha(options.color, 1-(h/(hd+1))));
					}
				}
			}
			history.push(y);
		}
	}
	
	return this;
}

chart.prototype.setPixel = function(x, y, color, pixelOverwride) {
	
	var scope = this;
	x = Math.round(x);
	y = Math.round(y);
	if (x<0||x>this.options.width||y<0||y>this.options.height) {return this;}
	var index	= y * this.options.width + x;
	
	if (color === 0 ) {
		return false;
	}
	
	var index, pix, newpix;
	
	// Decode the current value
	if (this.pixels[index] === 0 || pixelOverwride) {
		this.pixels[index]	= scope.rgba_encode(color);
	} else {
		pix = this.rgba_decode(this.pixels[index]);
		
		
		newpix = {
			r:	(((color.r/255)*(color.a/255)) + ((pix.r/255)*(pix.a/255)) - ((pix.r/255)*(pix.a/255))*(color.a/255)) * (255/((color.a/255) + (pix.a/255) - (color.a/255)*(pix.a/255)))^0,
			g:	(((color.g/255)*(color.a/255)) + ((pix.g/255)*(pix.a/255)) - ((pix.g/255)*(pix.a/255))*(color.a/255)) * (255/((color.a/255) + (pix.a/255) - (color.a/255)*(pix.a/255)))^0,
			b:	(((color.b/255)*(color.a/255)) + ((pix.b/255)*(pix.a/255)) - ((pix.b/255)*(pix.a/255))*(color.a/255)) * (255/((color.a/255) + (pix.a/255) - (color.a/255)*(pix.a/255)))^0,
			a:	Math.abs(Math.min(255,pix.a+color.a))^0
		};
		
		//console.log("newpix",index, newpix);
		
		this.pixels[index]	= scope.rgba_encode(newpix);
		
	}
	
	return this;
}

// Encode an rgba color into an int
chart.prototype.rgba_encode = function(color) {
	// We encode into a int a 255 buffer, probability, position and direction
	//return (color.a << 24) | (color.b << 16) | (color.g << 8) | color.r;
	return (color.r<<24|color.g<<16|color.b<<8|color.a);
}

// Decode an int into an rgba color
chart.prototype.rgba_decode = function(pixel) {
	// (color.a << 24) | (color.b << 16) | (color.g << 8) | color.r;
	// ((Math.abs(color.a) || 255) << 24) | (color.b << 16) | (color.g << 8) | color.r
	return {
		r:		0xFF & (pixel >> 24),
		g:		0xFF & (pixel >> 16),
		b:		0xFF & (pixel >> 8),
		a:		0xFF & pixel
	};
	/*return {
		r:		pixel&0x000000FF,
		g:		(pixel&0x0000FF00)>>8,
		b:		(pixel&0x00FF0000)>>16,
		a:		(pixel&0xFF000000)>>24
	};*/
}

chart.prototype.index = function(x, y, w) {
	if (!w) {
		w = this.options.width;
	}
	return y * w + x;
}

chart.prototype.inv_index = function(i, w) {
	/*
		y	= (i/w)^0
		x	= i-(y*w)
	*/
	if (!w) {
		w = this.options.width;
	}
	var y	= (i/w)^0;
	var x	= i-(y*w);
	return {
		x:	x,
		y:	y
	}
}

chart.prototype.map = function( x,  in_min,  in_max,  out_min,  out_max) {
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}






chart.prototype.merge = function(blocks) {
	var scope = this;
	_.each(blocks, function(block) {
		/*console.log("Merging",{
			x:	block.left,
			y:	block.top,
			w:	block.chart.width,
			h:	block.chart.height
		});*/
		var i;
		var l = block.chart.pixels.length;
		var newCoord;
		for (i=0;i<l;i++) {
			newCoord = {
				x:	scope.inv_index(i, block.chart.width).x+block.left,
				y:	scope.inv_index(i, block.chart.width).y+block.top,
			};
			scope.setPixel(newCoord.x, newCoord.y, scope.rgba_decode(block.chart.pixels[i]));
		}
		
		return true;
	});
	
	return this;
}




chart.prototype.export = function(filename, callback) {
	var scope = this;
	
	filename	= path.normalize(filename);
	
	switch (path.extname(filename).toLowerCase()) {
		case ".png":
			var image = new png({
				width:	this.options.width,
				height:	this.options.height
			});
			
			// Now we convert the data
			var x,y,idx,idxpix;
			for (y = 0; y < this.options.height; y++) {
				for (x = 0; x < this.options.width; x++) {
					idx					= (this.options.width * y + x) << 2;
					idxpix				= this.index(x,y);
					color				= this.rgba_decode(this.pixels[idxpix]);
					image.data[idx]		= color.r;
					image.data[idx+1]	= color.g;
					image.data[idx+2]	= color.b;
					image.data[idx+3]	= color.a;
				}
			}
			
			var writeStream = fs.createWriteStream(filename);
			image.pack().pipe(writeStream);
			writeStream.on('finish', function() {
				callback(filename);
			});
			writeStream.on('error', function (err) {
				//console.log("Error - export(png)", err);
			});
		break;
		case '.jpg':
		case '.jpeg':
			var rawImageData = {
				data:	new Buffer(this.options.width*this.options.height*4),
				width:	this.options.width,
				height:	this.options.height
			};
			
			// Now we convert the data
			var x,y,idx,idxpix;
			for (y = 0; y < this.options.height; y++) {
				for (x = 0; x < this.options.width; x++) {
					idx					= (this.options.width * y + x) << 2;
					idxpix				= this.index(x,y);
					color				= this.rgba_decode(this.pixels[idxpix]);
					rawImageData.data[idx]		= color.r;
					rawImageData.data[idx+1]	= color.g;
					rawImageData.data[idx+2]	= color.b;
					rawImageData.data[idx+3]	= color.a;
				}
			}
			
			var encoded = jpgExport.encode(rawImageData, 50);
			
			// Write the buffer to a file
			fs.open(filename, 'w', function(err, fd) {
				if (err) {
					//console.log("Unable to write file "+filename);
					callback(false);
					return false;
				}
				
				fs.write(fd, encoded.data, 0, encoded.data.length, null, function(err) {
					if (err) {
						//console.log("Error writing file "+filename);
						callback(false);
						return false;
					}
					fs.close(fd, function() {
						callback(filename);
					})
				});
			});
			
			
		break;
	}
	
	return this;
}

chart.prototype.toBase64String = function(callback) {
	
	var filename	= path.normalize(this.options.temp+'/'+shortid.generate()+'.png');
	
	var temp	= this.export(filename, function() {
		var data = fs.readFileSync(filename).toString("base64");
		
		//console.log("returning the data");
		var output	= util.format("data:%s;base64,%s", mime.lookup(filename), data);
		fs.unlinkSync(filename);
		
		callback(output);
		
		// Delete the temp file
		//console.log("removing the file", filename);
		//fs.unlinkSync(filename);
		/*fs.unlink(filename, function(err) {
			console.log(">> err",err);
		});*/
		//fstool.file.remove(filename, function() {});
	});
}


module.exports = chart;
