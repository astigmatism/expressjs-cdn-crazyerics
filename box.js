const fs = require('fs-extra');
const Main = require('./main.js');
const path = require('path');
const config = require('config');
const async = require('async');

const processedRoot = path.join(__dirname, '/','processed','box', 'front');
const mediaRoot = path.join(__dirname, '/','media','box');
const mediaFrontRoot = path.join(mediaRoot, 'front');
const templateRoot = path.join(mediaRoot, 'template');

module.exports = new (function() {

    var _self = this;

	this.GetFront = function(gk, width, height, callback, opt_skipSave, opt_mediaFile) {

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
        var mediaFilePath = path.join(mediaFrontRoot, gameKey.system, gameKey.title, '0.jpg');

        //stop! special case to return the media source image right away
        if (opt_mediaFile) {
            fs.readFile(mediaFilePath, (err, buffer) => {
                if (err) return callback(404, 'not found')
                return callback(200, null, buffer);
            });
            return;
        }

        //to save the most time, first look directly for a pre-processed image
        fs.readFile(processedFilePath, (err, processedImageBuffer) => {
            //err here would indicate an issue getting the processed image, no problem, time to make one
            if (err) {

                //get the media file
                fs.readFile(mediaFilePath, (err, mediaFileBuffer) => {
                    
                    var _finally = function(status, buffer) {

                        Main.ResizeImage(processedPath, buffer, width, height, function(err, output) {
                            if (err) return callback(500, err);
                            callback(status, null, output);
                        
                        }, opt_skipSave);
                    }
                    
                    //err getting the media file, time to use the blank box art with composited text
                    if (err) {
                        //if no images returned, composite on template
                        _self.CompositeTextOnBoxTemplate(gameKey.system, gameKey.title, (err, compositedTextBuffer) => {
                            if (err) return callback(500, err);
                            _finally(203, compositedTextBuffer); //if composited text on a box template, use 203 (external source)
                        
                        });
                    }
                    else {
                        _finally(201, mediaFileBuffer); // 201 "Created" informs the client a processed image was created from the media folder
                    }
                });
            }
            //we got back a processed image right away
            else {
                callback(200, null, processedImageBuffer); //200 successfully retieved processed image
            }
        });
    };

    //just get the raw image src from the cdn location of choice. I use this for the media browser
    this.GetSrc = function(gk, type, location, callback) {

        //first, we must have meaningful data out of the gk
        var gameKey = Main.Decompress.gamekey(gk);

        if (!gameKey) {
            return callback(400, 'err 1');
        }

        var filePath = path.join(__dirname, '/', location, 'box', type, gameKey.system, gameKey.title, '0.jpg');

        fs.readFile(filePath, (err, buffer) => {
            if (err) return callback(404, 'not found')
            return callback(200, null, buffer);
        });
    };

    this.CompositeTextOnBoxTemplate = function(system, text, callback) {

        fs.readFile(path.join(templateRoot, system, '0.png'), (err, data) => {
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

    this.Audit = function(boxtype, system, callback) {

        var mediaPath = path.join(mediaRoot, boxtype, system); //boxtype: front, back, etc
        var audit = {};

        //get another directory listing
        Main.GetSortedDirectories(mediaPath, (err, titles) => {
            if (err) return callback(500, err);

            var i = 0, len = titles.length;
            for (i; i < len; ++i) {
                var title = titles[i];
                if (!audit.hasOwnProperty(title)) {
                    
                    //i have nothing to put in this object at the moment but perhaps ces could use something someday
                    audit[title] = {
                    };
                }
            }

            return callback(null, null, audit);
        });
    };
});
