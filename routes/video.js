
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
const Video = require('../video');
const cors = require('cors');
const router = express.Router();
const config = require('config');

const videoTypesRegex = (function() {

    var result = '(';
    var i = 0;
    var videoTypes = config.videotypes;
    for (i; i < videoTypes.length; ++i) {
        result += videoTypes[i] + ((i < videoTypes.length - 1) ? '|' : '');
    }
    result += ')';
    return result;
})();

router.get('/:videotype/:gk', cors(), (req, res, next) => {

    var gk = req.params.gk;
    var videoType = req.params.videotype; //sq, hd??, 4k?? see config

    //gk required
    if (!gk) {
        return res.status(400).json('err 0.0'); //400 Bad Request
    }
    if (!videoType.match(videoTypesRegex)) {
        return res.status(400).json('err 0.1');
    }

    Video.Get(videoType, gk, (status, err, buffer) => {
        if (err) return res.status(status).json(err);

        res.status(status).end(buffer, 'buffer');
    });
});

module.exports = router;
