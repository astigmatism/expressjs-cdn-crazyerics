
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
 * 
 * 400 - bad request
 * 403 - forbidden
 * 404 - not found
 */

var fs = require('fs-extra');
const path = require('path');
var express = require('express');
var Main = require('../main');
var Titlescreen = require('../titlescreen');
var router = express.Router();

const contributionsPath = path.join(__dirname, '../','public','contributions');

router.post('/contribute/titlescreen', (req, res, next) => {
    
    var formdata = req.body.cxhr; //this name means nothing, but it MUST be sent by the client of course

    if (!formdata) {
        return res.status(400).json('err 0');
    }

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    Titlescreen.Set(formdata, (status, err, response) => {
        if (err) {
            return res.status(status).json(err);
        }
        res.json(response);
    });
});

router.get('/titlescreen/:gk', (req, res, next) => {

    var gk = req.params.gk;
    var width = req.query.w;
    var height = req.query.h;

    //gk required
    if (!gk) {
        return res.status(400).json('err 0'); //400 Bad Request
    }

    //convert optional params
    if (width) {
        width = parseInt(width, 10);
    }
    if (height) {
        height = parseInt(height, 10);
    }

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    Titlescreen.Get(gk, width, height, (status, err, response) => {
        if (err) {
            return res.status(status).json(err);
        }
        res.json(response);
    });
});

module.exports = router;
