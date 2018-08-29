
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
var Main = require('../main');
var Box = require('../box');
var router = express.Router();
var cors = require('cors');
var corsConfig = require('../corsConfig');
var fs = require('fs-extra');
var path = require('path');

const mediaRoot = path.join(__dirname, '../','media');

//returns a manifest of all titles with boxart
router.get('/box/front/:system', (req, res) => {

    var system = req.params.system;

    if (!system) {
        return res.status(400).end('err 0'); //400 Bad Request
    }

    Box.Audit('front', system, (status, err, auditResult) => {
        if (err) return res.status(status).json(err);

        return res.status(200).json(auditResult);
    });
});

//audit all media for gk
router.get('/:gk', cors(), (req, res) => {

    var gk = req.params.gk;

    //gk required
    if (!gk) {
        return res.status(400).end('err 0'); //400 Bad Request
    }

    //first, we must have meaningful data out of the gk
    var gameKey = Main.Decompress.gamekey(gk);

    if (!gameKey) {
        return res.status(400).end('err 1');
    }

    var response = {};

    //box front
    var boxfrontfolder = path.join(mediaRoot, 'box', 'front', gameKey.system, gameKey.title);
    if (fs.existsSync(boxfrontfolder)) {
        response.boxfront = true;
    }

    //titlescreen
    var titlescreenfolder = path.join(mediaRoot, 'screen', 'title', gameKey.system, gameKey.title, gameKey.file);
    if (fs.existsSync(titlescreenfolder)) {
        response.titlescreen = true;
    }

    //sq video
    var sqvideopath = path.join(mediaRoot, 'video', 'sq', gameKey.system, gameKey.title);
    if (fs.existsSync(sqvideopath)) {
        var data = fs.readJsonSync(path.join(sqvideopath, 'info.json'), { throws: false }); //returns null if invalid json
        
        response.sqvideo = data;
    }

    res.status(200).json(response);
});

module.exports = router;
