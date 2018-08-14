
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
var express = require('express');
var router = express.Router();
var cors = require('cors');
var corsConfig = require('../corsConfig');
var Game = require('../game');

// I want to prevent any client from simply asking for any size image since that image is saved
//back to the cdn. let's instead white list allowable resizes
router.get('/:system/:gk', cors(), (req, res, next) => {

    var system = req.params.system;
    var gk = req.params.gk;

    //gk required
    if (!gk) {
        return res.status(400).end('err 0'); //400 Bad Request
    }

    Game.GetRom(gk, (status, err, buffer) => {
        if (err) {
            return res.status(status).json(err);
        }
        res.status(status).json(buffer);
    });
});

module.exports = router;
