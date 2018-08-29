
/**
 * 
 * CDN Custom Routing.
 * 
 * Be aware of custom response codes and error messages. They are not descriptive on purpose. 
 * Please refer to the methods themselves for failure points.
 * 
 * Use correct response status codes:
 * 
 * 200 - success: In general this is the code to check on the client-end to ensure the expected response is returned
 * 201 - success and resource created. I'll use this when the CDN generates content
 * 203 - The server processed the request successfully, but is returning data from another source (or something)
 * 204 - success, but no content (removes any content from the response body)
 * 
 * 400 - bad request
 * 403 - forbidden
 * 404 - not found
 */

const express = require('express');
const Screen = require('../screen');
const cors = require('cors');
const corsConfig = require('../corsConfig');
const Main = require('../main');
const router = express.Router();
const config = require('config');

const screenTypesRegex = (function() {

    var result = '(';
    var i = 0;
    var screenTypes = config.screentypes;
    for (i; i < screenTypes.length; ++i) {
        result += screenTypes[i] + ((i < screenTypes.length - 1) ? '|' : '');
    }
    result += ')';
    return result;
})();

//this endpoint is designed to be accessed by ONE cdn server
//we will then update the other servers async
//see nginx conf on the server to configure.
router.post('/:screentype/contribute', cors(), (req, res, next) => {
    
    var formdata = req.body.cxhr; //this name means nothing, but it MUST be sent by the client of course
    var screenType = req.params.screentype; //title, screen

    if (!formdata) {
        return res.status(400).json('err 0');
    }
    if (!screenType.match(screenTypesRegex)) {
        return res.status(400).json('err 1');
    }

    Screen.Set(screenType, formdata, (status, err, response) => {
        if (err) return res.status(status).json(err);
        
        Main.SyncContributions(err => {
            console.log(err);
        });

        res.json(response);
    });
});

router.get('/:screentype/:cdnSizeModifier/:gk', cors(), (req, res, next) => {

    var modifier = req.params.cdnSizeModifier;
    var gk = req.params.gk;
    var screenType = req.params.screentype; //title, screen
    var getOriginal = false;

    //gk required
    if (!gk) {
        return res.status(400).json('err 0'); //400 Bad Request
    }
    if (!screenType.match(screenTypesRegex)) {
        return res.status(400).json('err 1');
    }

    var width, height;

    switch (modifier) {
        case 'a':
            width = 160;
            break;
        case 'b':
            width = 320; //most of the emumovies in SQ are this size (320x240)
            break;
        case 'c':
            width = 240; //halfway between 320 and 160 :)
            break;
        case 'z':
            //no resize, original file
            getOriginal = true;
            break;
        default:
            return res.status(400).end('err 1');
    }

    Screen.Get(screenType, gk, width, height, (status, err, base64ImageData) => {
        if (err) return res.status(status).json(err);

        res.status(status).send(base64ImageData);
    }, getOriginal);
});

module.exports = router;
