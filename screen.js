var fs = require('fs-extra');
var Main = require('./main.js');
const path = require('path');

const processedRoot = path.join(__dirname, '/','processed', 'screen');
const mediaRoot = path.join(__dirname, '/','media', 'screen');
const contributionsRoot = path.join(__dirname, '/','contributions', 'screen');

module.exports = new (function() {

    var _self = this;

	this.Get = function(screenType, gk, width, height, callback, opt_customOperation) {

        //first, we must have meaningful data out of the gk
        var gameKey = Main.Decompress.gamekey(gk);

        if (!gameKey) {
            //console.log('unable to parse gameKey from --> ' + gk);
            return callback(400, 'err 1.0');
        }

        //create a string for a unique filename (since these can be undef or null).
        var widthAndHeight = (width) ? 'w' + width : '';
        widthAndHeight += (height) ? 'h' + height : '';

        var processedPath = path.join(processedRoot, screenType, gameKey.system, gameKey.title, gameKey.file, widthAndHeight);
        var processedFilePath = path.join(processedPath, '0.jpg');
        var mediaFilePath = path.join(mediaRoot, screenType, gameKey.system, gameKey.title, gameKey.file, '0.jpg');
        var contributionFilePath = path.join(contributionsRoot, screenType, gameKey.system, gameKey.title, gameKey.file, '0.jpg');

        var pathsToSearch = [processedFilePath, mediaFilePath, contributionFilePath];

        //stop! special cases
        if (opt_customOperation) {

            var assetLoadPath = mediaFilePath; //default, load from media folder
            
            if (opt_customOperation === 'contributions') {
                assetLoadPath = contributionFilePath;
            }

            fs.readFile(assetLoadPath, (err, buffer) => {
                if (err) return callback(404, 'not found')

                var base64String = new Buffer(buffer).toString('base64'); //convert data to base64
                return callback(200, null, base64String);
            });
            return; //bail
        }

        Main.OpenFileAlternates(pathsToSearch, function(err, data, successIndex) {
            if (err) {
                return callback(404, 'err 1.1'); //no files found, 404
            }

            //create processed image by resizing on the fly
            if (successIndex != 0) {
                Main.ResizeImage(processedPath, data, width, height, function(err, output) {
                    if (err) {
                        return callback(500, err);
                    }

                    var base64String = new Buffer(output).toString('base64'); //convert data to base64
                    callback(201, null, base64String);
                });
            }
            //we got back our already resized image from the process folder
            else {

                var base64String = new Buffer(data).toString('base64'); //convert data to base64
                callback(200, null, base64String);
            }
        });
    };

    this.Set = function(screenType, formdata, callback) {
        
        var data = Main.Decompress.json(formdata);

        //ensure decopressed data is present before continuing
        if (data && data.contents && data.gameKey) {

            var gameKey = data.gameKey;
            var contents = data.contents;

            var screenContributionPath = path.join(contributionsRoot, screenType, gameKey.system, gameKey.title, gameKey.file);
            var filename = '0.jpg';

            //remove existing processed folder (all w and h mods inside)
            //so that new can be generated from this contribution
            fs.emptyDir(path.join(processedRoot, screenType, gameKey.system, gameKey.title, gameKey.file), (err) => {
                if (err) return callback(500, 'err 1.2');

                //write file
                fs.ensureDir(screenContributionPath, err => {
                    if (err) return callback(500, 'err 1.3');

                    fs.writeFile(path.join(screenContributionPath, filename), contents, 'base64', (err) => {
                        if (err) return callback(500, 'err 1.5');

                        return callback(null, null, contents);
                    });
                });
            });
        }
        else {
            return callback(400, 'err 1.4');
        }
    };
});
