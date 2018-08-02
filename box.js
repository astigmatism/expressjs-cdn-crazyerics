var fs = require('fs-extra');
var Main = require('./main.js');
const path = require('path');

const boxFrontPath = path.join(__dirname, '/','public','boxes', 'front');

module.exports = new (function() {

    var _self = this;

	this.GetFront = function(gk, width, height, callback) {

        //first, we must have meaningful data out of the gk
        var gameKey = Main.Decompress.gamekey(gk);

        if (!gameKey) {
            return callback(400, 'err 1');
        }

        var pathsToSearch = [
            //first search for a resized previously by sharp and saved to the fs
            //second, find the original box front (it will have to be resized)
            //use the standard "no box art" image
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
