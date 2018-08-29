
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

router.get('/media/audit/:gk', (req, res, next) => {

    var gk = req.params.gk;

    //gk required
    if (!gk) {
        return res.status(400).end('err 0'); //400 Bad Request
    }

    //first, we must have meaningful data out of the gk
    var gameKey = Main.Decompress.gamekey(gk);

    if (!gameKey) {
        return callback(400, 'err 1');
    }

});

module.exports = router;
