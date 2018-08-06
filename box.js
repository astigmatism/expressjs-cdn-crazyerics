const fs = require('fs-extra');
const Main = require('./main.js');
const path = require('path');
const config = require('config');
const async = require('async');

const processedRoot = path.join(__dirname, '/','processed','box', 'front');
const boxPath = path.join(__dirname, '/','media','box');
const boxFrontPath = path.join(boxPath, 'front');

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

        Main.OpenFileAlternates(pathsToSearch, function(err, data, successIndex) {
            if (err) {

                //ok, so if we never get back a genuine image, we have to return the "no box art" image instead
                GetEmptyCartridgeImage(gameKey, width, height, (status, err, imageBuffer) => {
                    if (err) return callback(status, err);

                    //if retrieved, always return with status of 203 "Non-Authoritative Information" to inform the client
                    return callback(203, null, imageBuffer)
                });
            } 
            else {

                //create processed image by resizing on the fly
                if (successIndex != 0) {
                    
                    Main.ResizeImage(processedPath, data, width, height, function(err, output) {
                        if (err) {
                            return callback(500, err);
                        }

                        callback(201, null, output); // 201 resource created
                    });
                }
                //we got back our already resized image from the process folder
                else {
                    
                    callback(200, null, data); //200 successfully retieved
                }
            }
        });
    };

    var GetEmptyCartridgeImage = function(gameKey, width, height, callback) {
        
        //create a string for a unique filename (since these can be undef or null).
        var widthAndHeight = (width) ? 'w' + width : '';
        widthAndHeight += (height) ? 'h' + height : '';

        var processedPath = path.join(processedRoot, gameKey.system, gameKey.title, widthAndHeight);
        
        var pathsToSearch = [
            path.join(processedPath, '0.jpg'), //the resized "no box"
            path.join(boxFrontPath, gameKey.system, '0.png') //the original "no box", yes in png
        ];

        Main.OpenFileAlternates(pathsToSearch, function(err, data, successIndex) {
            if (err) {
                return callback(404, err); //ok, we really don't have this! lol
            } 

            //create processed image by resizing on the fly
            if (successIndex != 0) {

                //compositing will be required
                var compositingConfig = config.compositing[gameKey.system];
                if (!compositingConfig) {
                    return callback(500, 'no composite config found for system: ' + gameKey.system);
                }

                Main.ResizeImage(processedPath, data, width, height, function(err, output) {
                    if (err) {
                        return callback(500, err);
                    }

                    //callback(203, null, new Buffer(output).toString('base64'));
                    callback(203, null, output);

                }, gameKey.title, compositingConfig);

            }
            //we got back our already resized image from the process folder
            else {
                
                callback(203, null, data);
            }
        });
    };

    this.Audit = function(subfolder, system, callback) {

        var rootPath = path.join(boxPath, subfolder, system);
        var locations = [];
        var audit = {};

        if (config.media.box[subfolder][system]) {
            locations = config.media.box.front[system];
        }

        //open each location and build a manifest of found boxart
        async.eachSeries(locations, (location, nextLocation) => {
            
            var source = path.join(rootPath, location);

            //read all the title dirs
            fs.readdir(source, function(err, titles) {
                if (err) return nextLocation(err);

                var i = 0, len = titles.length;
                for (i; i < len; ++i) {
                    var title = titles[i];
                    if (!audit.hasOwnProperty(title)) {
                        audit[title] = {
                            source: location
                        }
                    }
                }

                return nextLocation();
            });

        }, (err) => {
            if (err) return callback(500, err);

            return callback(null, null, audit);
        });

    };
});
