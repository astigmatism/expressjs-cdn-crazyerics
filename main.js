var fs = require('fs-extra');
var pako = require('pako');
var btoa = require('btoa');
var atob = require('atob');
const Sharp = require('sharp'); //http://sharp.dimens.io/en/stable/install/
const Jimp = require('jimp'); //https://www.npmjs.com/package/jimp
const path = require('path');

const mediaRoot = path.join(__dirname, '/','media');

module.exports = new (function() {

    var _self = this;

    /**
     * 
     * @param {*} image buffer
     * @param {Number | null | undefined} width if both are undef or null, callback is called with original buffer
     * @param {Number | null | undefined} height 
     * @param {*} callback 
     */
    this.ResizeImage = function(processedPath, image, width, height, callback, opt_text, opt_compositeConfig) {

        //bail when both are not defined
        if (!width && !height) {
            return callback(null, image);
        }

        //determine resize library
        if (opt_text) {

            JimpResize(image, width, height, opt_text, opt_compositeConfig, (err, output) => {
                if (err) return callback(err);

                SaveProcessedImage(processedPath, output, (err, buffer) => {
                    if (err) return callback(err);

                    return callback(null, buffer);
                });
            });
        }
        else {

            SharpResize(image, width, height, (err, output) => {

                if (err) return callback(err);

                SaveProcessedImage(processedPath, output, (err, buffer) => {
                    if (err) return callback(err);

                    return callback(null, buffer);
                });
            });
        }
    };

    var SaveProcessedImage = function(processedPath, imageBuffer, callback) {

        //to avoid saving for debugging
        //return callback(null, imageBuffer);

        //ensure directory exists
        fs.ensureDir(processedPath, (err) => {
            if (err) {
                return callback(err);
            }

            var processedFilePath = path.join(processedPath, '0.jpg');

            //write the output buffer to the file location
            fs.writeFile(processedFilePath, imageBuffer, (err) => {
                if (err) {
                    return callback(err);
                }
                return callback(null, imageBuffer);
            });
        });
    };

    var SharpResize = function(image, width, height, callback) {

        Sharp(image)
            .resize(width, height, {
                kernel: Sharp.kernel.lanczos3
            })
            .toBuffer((err, buffer) => {
                if (err) return callback(err);

                callback(null, buffer)
            });
    };

    var JimpResize = function(image, width, height, text, compositeConfig, callback) {

        Jimp.read(image, (err, output) => {
            if (err) return callback(err);
            
            if (!width) width = Jimp.AUTO;
            if (!height) height = Jimp.AUTO;

            Jimp.loadFont(path.join(mediaRoot, compositeConfig.font)).then((font) => {

                output.print(
                    font,
                    compositeConfig.x, //x start
                    compositeConfig.y, //y srart
                    {
                        text: text,
                        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                    },
                    compositeConfig.width, //width
                    compositeConfig.height //height
                );
    
                output.resize(width, height, Jimp.RESIZE_BEZIER); //resize after composite

                output.getBuffer(Jimp.MIME_JPEG, (err, buffer) => {
                    if (err) return callback(err);
    
                    return callback(null, buffer);
                });
            });
        }); 
    };

    this.GetSortedDirectories = function(rootPath, callback) {
        fs.readdir(rootPath, (err, listing) => {
            if (err) return callback(err);
            
            var locations = [];

            //folders to array
            listing.map(file => {
                return path.join(rootPath, file);
            }).filter(file => {
                return fs.statSync(file).isDirectory();
            }).filter(file => {
                return !(/(^|\/)\.[^\/\.]/g).test(file) //remove hidden folders
            }).forEach(function (folder) {
                locations.push(folder);
            });

            //now sort the array based on name
            locations.sort(function(a, b){
                if(a > b) return 1;
                if(a < b) return -1;
                return 0;
            });

            return callback(null, locations);
        });
    }

    this.OpenFileAlternates = function(paths, callback, _currentIndex) {

        var index = _currentIndex || 0;

        fs.readFile(paths[index], (err, data) => {
            if (err) {
                //if error, proceed to alternate path
                if (index < paths.length - 1) {
                    return this.OpenFileAlternates(paths, callback, index + 1);
                }
                //no more files to try :(
                return callback('no files returned data');
            }
            //this file was successfully openned
            return callback(null, data, index);
        });
    }

    var GameKey = (function(system, title, file, gk) {
		this.system = system;
		this.title = title;
		this.file = file;
		this.gk = gk;			//the original compressed json of this key should it be needed again
	});

    this.Compress = {
        bytearray: function(uint8array) {
            var deflated = pako.deflate(uint8array, {to: 'string'});
            return btoa(deflated);
        },
        json: function(json) {
            var string = JSON.stringify(json);
            var deflate = pako.deflate(string, {to: 'string'});
            var base64 = btoa(deflate);
            return base64;
        },
        string: function(string) {
            var deflate = pako.deflate(string, {to: 'string'});
            var base64 = btoa(deflate);
            return base64;
        },
        gamekey: function(system, title, file) {
            return this.json({
                system: system,
                title: title,
                file: file
            });
        }
    };
    
    this.Decompress = {
        bytearray: function(item) {
            var decoded = new Uint8Array(atob(item).split('').map(function(c) {return c.charCodeAt(0);}));
            return pako.inflate(decoded);
        },
        json: function(item) {
            var base64 = atob(item);
            var inflate = pako.inflate(base64, {to: 'string'});
            var json = JSON.parse(inflate);
            return json;
        },
        string: function(item) {
            var base64 = atob(item);
            var inflate = pako.inflate(base64, {to: 'string'});
            return inflate;
        },
        gamekey: function(gk) {
			var gameKey;
			try {
				gameKey = this.json(gk);
			} catch (e) {
				return;
			}
			//must be an array of length 3 [system, title, file]
			if (gameKey.length && gameKey.length === 3) {
				return new GameKey(gameKey[0], gameKey[1], gameKey[2], gk);
			}
			return;
		}
    };
});
