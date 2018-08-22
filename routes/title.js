
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
const Titlescreen = require('../titlescreen');
const cors = require('cors');
const corsConfig = require('../corsConfig');
const Main = require('../main');
const router = express.Router();

//this endpoint is designed to be accessed by ONE cdn server
//we will then update the other servers async
//see nginx conf on the server to configure.
router.post('/contribute', cors(), (req, res, next) => {
    
    var formdata = req.body.cxhr; //this name means nothing, but it MUST be sent by the client of course

    if (!formdata) {
        return res.status(400).json('err 0');
    }

    Titlescreen.Set(formdata, (status, err, response) => {
        if (err) return res.status(status).json(err);
        
        Main.SyncContributions(err => {
            console.log(err);
        });

        res.json(response);
    });
});

router.get('/:cdnSizeModifier/:gk', cors(), (req, res, next) => {

    var modifier = req.params.cdnSizeModifier;
    var gk = req.params.gk;

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

module.exports = router;
