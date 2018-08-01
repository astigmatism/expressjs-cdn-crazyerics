var fs = require('fs-extra');
var Main = require('./main.js');
const path = require('path');

const titlescreensPath = path.join(__dirname, '/','public','titlescreens');
const contributionsPath = path.join(__dirname, '/','public','contributions','titlescreens');

module.exports = new (function() {

    var _self = this;

	this.Get = function(gk, callback) {

        //first, we must have meaningful data out of the gk
        var gameKey = Main.Decompress.gamekey(gk);

        if (!gameKey) {
            //console.log('unable to parse gameKey from --> ' + gk);
            return callback();
        }

        //first, look for proper title screen (which I would have uploaded)
        var titlescreenPath = path.join(titlescreensPath, gameKey.system, gameKey.title, gameKey.file, '0.jpg');
        fs.readFile(titlescreenPath, (err, data) => {
            if (err) {
                //maybe doesn't exist, try user contributed

                return callback();
            }

            var base64String = new Buffer(data).toString('base64');
            callback(null, base64String);
        });
    };
});
