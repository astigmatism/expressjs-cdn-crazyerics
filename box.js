const fs = require('fs-extra');
const Main = require('./main.js');
const path = require('path');
const config = require('config');

const processedRoot = path.join(__dirname, '/','processed','box', 'front');
const boxFrontPath = path.join(__dirname, '/','media','box', 'front');

module.exports = new (function() {

    var _self = this;

	this.GetFront = function(gk, width, height, callback) {

        //first, we must have meaningful data out of the gk
        var gameKey = Main.Decompress.gamekey(gk);

        if (!gameKey) {
            return callback(400, 'err 1');
        }

        //create a string for a unique filename (since these can be undef or null).
        var widthAndHeight = (width) ? 'w' + width : '';
        widthAndHeight += (height) ? 'h' + height : '';

        var pathsToSearch = [];

        //first look through processed
        var processedPath = path.join(processedRoot, gameKey.system, gameKey.title, widthAndHeight);
        var processedFilePath = path.join(processedPath, '0.jpg');

        pathsToSearch.push(processedFilePath);

        //next, look through all locations defined in config in media
        if (config.media.box.front[gameKey.system]) {
            var locations = config.media.box.front[gameKey.system];
            for (var i = 0; i < locations.length; ++i) {
                pathsToSearch.push(path.join(boxFrontPath, gameKey.system, locations[i], gameKey.title, '0.jpg'));
            }
        }

        //finally use the default, "no box art" image


        Main.OpenFileAlternates(pathsToSearch, function(err, data, successIndex) {
            if (err) {
                return callback(404, 'err 2'); //no files found, 404
            }

            //create processed image by resizing on the fly
            if (successIndex != 0) {
                
                Main.ResizeImage(processedPath, data, width, height, function(err, output) {
                    if (err) {
                        return callback(500, err);
                    }

                    //var base64String = new Buffer(output).toString('base64'); //convert data to base64
                    callback(null, null, output);
                });
            }
            //we got back our already resized image from the process folder
            else {

                //var base64String = new Buffer(data).toString('base64'); //convert data to base64
                callback(null, null, data);
            }
        });
    };
});
