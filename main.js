//const Sharp = require('sharp'); //http://sharp.dimens.io/en/stable/install/
var fs = require('fs-extra');
var pako = require('pako');
var btoa = require('btoa');
var atob = require('atob');
const Jimp = require('jimp'); //https://www.npmjs.com/package/jimp
const path = require('path');
const process = require('child_process');
const async = require('async');
const config = require('config');

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
    this.ResizeImage = function(processedPath, image, width, height, callback, opt_noSaveOnResize) {

        //bail when both are not defined and there's no compositing
        if (!width && !height) {
            return callback(null, image);
        }

        //resize with sharp library
        JimpResize(image, width, height, (err, output) => {
            if (err) {
                return callback(err);
                //if you're thinking to attempt Jimp on Sharp's failure, I tried this and Jimp always failed too
            }

            if (opt_noSaveOnResize) {
                return callback(null, output);
            }

            SaveProcessedImage(processedPath, output, (err, buffer) => {
                if (err) return callback(err);

                return callback(null, buffer);
            });
        });
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

    // var SharpResize = function(image, width, height, callback) {

    //     Sharp(image)
    //         .resize(width, height, {
    //             kernel: Sharp.kernel.lanczos3
    //         })
    //         .toBuffer((err, buffer) => {
    //             if (err) return callback(err);

    //             callback(null, buffer)
    //         });
    // };

    this.ComposeTextOnImage = function(image, text, compositeConfig, callback) {


        //instead create new image and compose text on it
        Jimp.create(compositeConfig.width, compositeConfig.height, 0x0, function (err, output) {
            if (err) return callback(err);

            var w = output.bitmap.width; // the width of the image
            var h = output.bitmap.height; // the height of the image

            output
                .rgba(false)
                .background(0xFFFFFFFF)

            Jimp.loadFont(path.join(mediaRoot, compositeConfig.font)).then((font) => {

                output.print(
                    font,
                    0, //x start
                    0, //y srart
                    {
                        text: text,
                        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                    },
                    w, //width
                    h //height
                );

                Jimp.read(image, (err, outputBase) => {

                    outputBase.composite(output, compositeConfig.x, compositeConfig.y); 

                    outputBase.getBuffer(Jimp.MIME_JPEG, (err, buffer) => {
                        if (err) return callback(err);
        
                        return callback(null, buffer);
                    });
                });
            });
        });


        // Jimp.read(image, (err, output) => {
        //     if (err) return callback(err);

        //     Jimp.loadFont(path.join(mediaRoot, compositeConfig.font)).then((font) => {

        //         output.print(
        //             font,
        //             compositeConfig.x, //x start
        //             compositeConfig.y, //y srart
        //             {
        //                 text: text,
        //                 alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        //                 alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        //             },
        //             compositeConfig.width, //width
        //             compositeConfig.height //height
        //         );

        //         output.getBuffer(Jimp.MIME_JPEG, (err, buffer) => {
        //             if (err) return callback(err);
    
        //             return callback(null, buffer);
        //         });
        //     });
        // }); 
    };

    var JimpResize = function(image, width, height, callback) {

        Jimp.read(image, (err, output) => {
            if (err) return callback(err);
            
            if (!width) width = Jimp.AUTO;
            if (!height) height = Jimp.AUTO;

            output.resize(width, height, Jimp.RESIZE_BEZIER); //resize after composite

            output.getBuffer(Jimp.MIME_JPEG, (err, buffer) => {
                if (err) return callback(err);

                return callback(null, buffer);
            });
        }).catch(err => {
            return callback(err);
        });
    };

    this.GetSortedDirectories = function(rootPath, callback) {
        fs.readdir(rootPath, (err, listing) => {
            if (err) return callback(err);
            
            var locations = [];

            //folders to array
            listing.map(file => {
                return file;
            }).filter(file => {
                return fs.statSync(path.join(rootPath, file)).isDirectory();
            }).filter(file => {
                return !(/(^|\/)\.[^\/\.]/g).test(path.join(rootPath, file)) //remove hidden folders
            }).forEach(file => {
                locations.push(file);
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

    this.SyncContributions = function(callback) {

        process.exec('unison ' + config.unison.profile, (err, stdout, stderr) => {
            if (err) return callback(err);

            console.log(stdout);
            callback();
        });
    };

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
