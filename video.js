var fs = require('fs-extra');
var Main = require('./main.js');
const path = require('path');

const mediaRoot = path.join(__dirname, '/','media', 'video');

module.exports = new (function() {

    var _self = this;

	this.Get = function(videoType, gk, callback) {

        //first, we must have meaningful data out of the gk
        var gameKey = Main.Decompress.gamekey(gk);

        if (!gameKey) {
            //console.log('unable to parse gameKey from --> ' + gk);
            return callback(400, 'err 1.0');
        }

        var mediaFilePath = path.join(mediaRoot, videoType, gameKey.system, gameKey.title, '0.mp4');

        fs.readFile(mediaFilePath, (err, data) => {
            if (err) return callback(404, 'not found');

            //this file was successfully openned
            return callback(200, null, data);
        });
    };
});
