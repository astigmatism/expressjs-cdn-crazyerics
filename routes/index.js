
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

var fs = require('fs-extra');
const path = require('path');
var express = require('express');
var Main = require('../main');
var Titlescreen = require('../titlescreen');
var Box = require('../box');
var router = express.Router();

router.post('/contribute/titlescreen', (req, res, next) => {
    
    var formdata = req.body.cxhr; //this name means nothing, but it MUST be sent by the client of course

    SetCORS(res, 'POST');

    if (!formdata) {
        return res.status(400).json('err 0');
    }

    Titlescreen.Set(formdata, (status, err, response) => {
        if (err) return res.status(status).json(err);

        res.json(response);
    });
});

router.get('/title/:cdnSizeModifier/:gk', (req, res, next) => {

    var modifier = req.params.cdnSizeModifier;
    var gk = req.params.gk;

    SetCORS(res);

    //gk required
    if (!gk) {
        return res.status(400).json('err 0'); //400 Bad Request
    }

    var width, height;

    switch (modifier) {
        case 'a':
            width = 160; //collections, suggestions
            break;
    }

    Titlescreen.Get(gk, width, height, (status, err, base64ImageData) => {
        if (err) return res.status(status).json(err);

        res.status(status).send(base64ImageData);
    });
});

// I want to prevent any client from simply asking for any size image since that image is saved
//back to the cdn. let's instead white list allowable resizes
router.get('/box/front/:cdnSizeModifier/:gk', (req, res, next) => {

    var modifier = req.params.cdnSizeModifier;
    var gk = req.params.gk;

    SetCORS(res);

    //gk required
    if (!gk) {
        return res.status(400).end('err 0'); //400 Bad Request
    }

    var width, height;

    switch (modifier) {
        case 'a':
            width = 116; //collections, suggestions
            break;
        case 'b':
            width = 50; //search auto-complete
            break;
        case 'c':
            width = 170; //game details (below emulator)
            break;
        case 'd':
            width = 200; //game loading??
            break;
        case 'e':
            width = 256; //texture for 3d game loading??
            height = 256;
            break;
    }

    Box.GetFront(gk, width, height, (status, err, imageBuffer) => {
        if (err) {
            return res.status(status).json(err);
        }
        res.status(status).end(imageBuffer, 'buffer');
    });
});

router.get('/audit/media/box/front/:system', function(req, res) {

    var system = req.params.system;

    if (!system) {
        return res.status(400).end('err 0'); //400 Bad Request
    }

    Box.Audit('front', system, (status, err, auditResult) => {
        if (err) return res.status(status).json(err);

        return res.status(200).json(auditResult);
    });
});

router.get('/box/test/:system', function(req, res) {

    var system = req.params.system;
    var text = req.query.text;

    if (!system) {
        return res.status(400).end('err 0'); //400 Bad Request
    }

    Box.CompositeTextOnBoxTemplate(system, text, function(err, buffer) {
        if (err) res.status(500).send(err);

        res.end(buffer, 'buffer');

    }, true); //true for opt_noSaveOnResize
});

var SetCORS = function(res, method) {

    method = method || 'GET';

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', method);
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
};

module.exports = router;
