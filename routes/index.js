var fs = require('fs-extra');
const path = require('path');
var express = require('express');
var Main = require('../main');
var router = express.Router();

const contributionsPath = path.join('public/contributions');

//expose this endpoint for crazyerics. allows uploading screenshot data
router.post('/contribute', (req, res, next) => {
    
    var formdata = req.body.cxhr; //this name means nothing, but it MUST be sent by the client of course

    if (formdata) {

        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,POST');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

        var data = Main.Decompress.json(formdata);

        //ensure decopressed data is present before continuing
        if (data && data.contents && data.gameKey) {

            var gameKey = data.gameKey;
            var contents = data.contents;

            //save title screen
            if (data.ts) {
                var destinationPath = path.join(contributionsPath, 'titlescreens', gameKey.system, encodeURIComponent(gameKey.gk));
                var filename = '0.jpg';
            }
            else {
                var destinationPath = path.join(contributionsPath, 'screenshots', gameKey.system, encodeURIComponent(gameKey.gk));
                var filename = Date.now() + '.jpg';
            }

            //write file
            fs.ensureDir(destinationPath, err => {
                if (err) {
                    return res.json(err);
                }

                fs.writeFile(path.join(destinationPath, filename), contents, 'base64', (err) => {
                    if (err) {
                        return res.json(err);
                    }
                    return res.json(contents);
                });
            });

        }
        else {
            res.json(data);
        }
    } else {
        res.json();
    }
});

module.exports = router;
