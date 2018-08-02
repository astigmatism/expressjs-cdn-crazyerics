var fs = require('fs-extra');
var pako = require('pako');
var btoa = require('btoa');
var atob = require('atob');
const Sharp = require('sharp'); //http://sharp.dimens.io/en/stable/install/

module.exports = new (function() {

    var _self = this;

    /**
     * 
     * @param {*} image buffer
     * @param {Number | null | undefined} width if both are undef or null, callback is called with original buffer
     * @param {Number | null | undefined} height 
     * @param {*} callback 
     */
    this.ResizeImage = function(image, width, height, callback) {

        //bail when both are not defined
        if (!width && !height) {
            return callback(image);
        }

        Sharp(image)
            .resize(width, height)
            .toBuffer(function(err, outputBuffer) {
                if (err) {
                    return callback(err);
                }
                return callback(null, outputBuffer);
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
            return callback(null, data);
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
