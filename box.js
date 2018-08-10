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

        var processedPath = path.join(processedRoot, gameKey.system, gameKey.title, widthAndHeight);
        var processedFilePath = path.join(processedPath, '0.jpg');
        var pathsToSearch = []; //used to build a list of locations to find the image media

        //to save the most time, first look directly for a pre-processed image
        fs.readFile(processedFilePath, (err, processedImageBuffer) => {
            if (err) {
                //err here would indicate an issue getting the processed image, no problem, time to make one

                //next, get a directory listing of the media folder to look through
                //NOTE: remember that the names of the folders indicate priority
                Main.GetSortedDirectories(path.join(boxFrontPath, gameKey.system), (err, listing) => {
                    if (err) return callback(500, 'err 2');
                    
                    var i = 0, len = listing.length;
                    for (i; i < len;++i) {
                        pathsToSearch.push(path.join(boxFrontPath, gameKey.system, listing[i], gameKey.title, '0.jpg'));
                    }

                    //to the end, add the box template image
                    //pathsToSearch.push(path.join(boxFrontPath, system, '0.png'));

                    Main.OpenFileAlternates(pathsToSearch, function(err, data, successIndex) {
                        
                        var _finally = function(status, buffer) {

                            Main.ResizeImage(processedPath, buffer, width, height, function(err, output) {
                                if (err) return callback(500, err);
                                callback(status, null, output);
                            });
                        }
                        

                        if (err) {
                            //if no images returned, composite on template
                            _self.CompositeTextOnBoxTemplate(gameKey.system, gameKey.title, (err, buffer) => {
                                if (err) return callback(500, err);
                                _finally(203, buffer); //if composited text on a box template, use 203 (external source)
                            });
                        }
                        else {
                            _finally(201, data); // 201 "Created" informs the client a processed image was created from the media folder
                        }
                    });
                });
            }
            //we got back a processed image right away
            else {
                callback(200, null, processedImageBuffer); //200 successfully retieved processed image
            }
        });
    };

    this.CompositeTextOnBoxTemplate = function(system, text, callback) {

        fs.readFile(path.join(boxFrontPath, system, '0.png'), (err, data) => {
            if (err) {
                return callback(err);
            } 

            //compositing will be required
            var compositingConfig = config.compositing[system];

            if (!compositingConfig) {
                return callback('no composite config found for system: ' + system);
            }

            Main.ComposeTextOnImage(data, text, compositingConfig, function(err, output) {
                if (err) {
                    return callback(err);
                }
                return callback(null, output);
            });
        });
    };

    this.Audit = function(subfolder, system, callback) {

        var rootPath = path.join(boxPath, subfolder, system);
        var locations = [];
        var audit = {};

        //get directory listing, each folder is a source of box front art
        Main.GetSortedDirectories(rootPath, (err, locations) => {
            if (err) return callback(500, err);

            //open each location and build a manifest of found boxart
            async.forEachOf(locations, (location, index, nextLocation) => {

                //get another directory listing
                Main.GetSortedDirectories(path.join(rootPath, location), (err, titles) => {
                    if (err) return nextLocation(err);

                    var i = 0, len = titles.length;
                    for (i; i < len; ++i) {
                        var title = titles[i];
                        if (!audit.hasOwnProperty(title)) {
                            
                            //i have nothing to put in this object at the moment but perhaps ces could use something someday
                            audit[title] = {
                                source: location,
                                rank: index
                            };
                        }
                    }

                    return nextLocation();
                });

            }, (err) => {
                if (err) return callback(500, err);

                return callback(null, null, audit);
            });
        });
    };
});
