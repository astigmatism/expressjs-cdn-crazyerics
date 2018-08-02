var fs = require('fs-extra');
var Main = require('./main.js');
const path = require('path');

const titlescreensPath = path.join(__dirname, '/','public','titlescreens');
const contributionsPath = path.join(__dirname, '/','public','contributions','titlescreens');

module.exports = new (function() {

    var _self = this;

	this.Get = function(gk, width, height, callback) {

        //first, we must have meaningful data out of the gk
        var gameKey = Main.Decompress.gamekey(gk);

        if (!gameKey) {
            //console.log('unable to parse gameKey from --> ' + gk);
            return callback(400, 'err 1');
        }

        var pathsToSearch = [
            path.join(titlescreensPath, gameKey.system, gameKey.title, gameKey.file, '0.jpg'), //my title screen location
            path.join(contributionsPath, gameKey.system, gameKey.title, gameKey.file, '0.jpg') //user contributed title screen location
        ];

        Main.OpenFileAlternates(pathsToSearch, function(err, data) {
            if (err) {
                return callback(404, 'err 2'); //no files found, 404
            }

            //resize on the fly if needed
            Main.ResizeImage(data, width, height, function(err, output) {
                if (err) {
                    return callback(500, err);
                }

                var base64String = new Buffer(output).toString('base64'); //convert data to base64
                callback(null, null, base64String);
            });
        });
    };

    this.Set = function(formdata, callback) {

        var data = Main.Decompress.json(formdata);

        //ensure decopressed data is present before continuing
        if (data && data.contents && data.gameKey) {

            var gameKey = data.gameKey;
            var contents = data.contents;

            var titlescreenPath = path.join(contributionsPath, gameKey.system, gameKey.title, gameKey.file);
            var filename = '0.jpg';

            //write file
            fs.ensureDir(titlescreenPath, err => {
                if (err) {
                    return callback('error 1');
                }

                fs.writeFile(path.join(titlescreenPath, filename), contents, 'base64', (err) => {
                    if (err) {
                        return callback('error 2');
                    }
                    return callback(null, contents);
                });
            });

        }
        else {
            return callback('error 0');
        }
    };
});
