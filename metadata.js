const fs = require('fs-extra');
const Main = require('./main.js');
const path = require('path');
const config = require('config');
const async = require('async');

const mediaRoot = path.join(__dirname, '/','media','metadata');
const mediaLaunchboxRoot = path.join(mediaRoot, 'launchbox');

module.exports = new (function() {

    var _self = this;

    this.GetLaunchbox = function(gk, callback) {

        //first, we must have meaningful data out of the gk
        var gameKey = Main.Decompress.gamekey(gk);

        if (!gameKey) {
            return callback(400, 'err 1.0');
        }

        var mediaFilePath = path.join(mediaLaunchboxRoot, gameKey.system, gameKey.title, '0.json');

        fs.readJson(mediaFilePath, (err, data) => {
            if (err) return callback(404, err);
            return callback(200, null, data);
        });
    };

    this.Audit = function(type, system, callback) {

        var mediaPath = path.join(mediaRoot, type, system); //boxtype: front, back, etc
        var audit = {};

        fs.readdir(mediaPath, (err, titles) => {
            if (err) return callback(400, 'err1.0');

            async.eachSeries(titles, (title, nexttitle) => {

                fs.readJson(path.join(mediaPath, title, '0.json'), (err, data) => {
                    if (err) return nexttitle(err);

                    audit[title] = data;
                    nexttitle();
                });

            }, err => {
                if (err) return callback(400, 'err1.1');
                callback(200, null, audit);
            });
        });
    };
});
