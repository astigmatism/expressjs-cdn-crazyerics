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
                //NOTE: remember that the names of the folders indictae priority
                Main.GetSortedDirectories(path.join(boxFrontPath, gameKey.system), (err, listing) => {
                    if (err) return callback(500, 'err 2');
                    
                    var i = 0, len = listing.length;
                    for (i; i < len;++i) {
                        pathsToSearch.push(path.join(listing[i], gameKey.title, '0.jpg'));
                    }

                    Main.OpenFileAlternates(pathsToSearch, function(err, data, successIndex) {
                        if (err) {
                            
                            //an err here STILL means we couldn't find art

                            //ok, so if we never get back a genuine image, we have to return the "no box art" image instead
                            GetEmptyCartridgeImage(gameKey, width, height, (status, err, imageBuffer) => {
                                if (err) return callback(status, err);
            
                                //if retrieved, always return with status of 203 "Non-Authoritative Information" 
                                //to inform the client the art returned is the "no art found" solution
                                return callback(203, null, imageBuffer)
                            });
                        }
                        else {

                            Main.ResizeImage(processedPath, data, width, height, function(err, output) {
                                if (err) return callback(500, err);
                                
                                // 201 "Created" informs the client a processed image was created
                                callback(201, null, output);    
                            });
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

        //get directory listing, each folder is a source of box front art
        Main.GetSortedDirectories(rootPath, (err, locations) => {
            if (err) return callback(500, err);

            //open each location and build a manifest of found boxart
            async.eachSeries(locations, (location, nextLocation) => {

                //read all the title dirs
                fs.readdir(location, function(err, listing) {
                    if (err) return nextLocation(); //on the error of openning a folder defined in the config, just move on

                    var titles = [];

                    //folders to array
                    listing.map(file => {
                        return path.join(location, file);
                    }).filter(file => {
                        return fs.statSync(file).isDirectory();
                    }).filter(file => {
                        return !(/(^|\/)\.[^\/\.]/g).test(file) //remove hidden folders
                    }).forEach(function (folder) {
                        titles.push(folder);
                    });

                    var i = 0, len = titles.length;
                    for (i; i < len; ++i) {
                        var title = titles[i];
                        if (!audit.hasOwnProperty(title)) {
                            
                            //i have nothing to put in this object at the moment but perhaps ces could use something someday
                            audit[title] = {};
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
