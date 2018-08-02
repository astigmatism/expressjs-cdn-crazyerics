var fs = require('fs-extra');
const path = require('path');
var express = require('express');
var Main = require('../main');
var Titlescreen = require('../titlescreen');
var router = express.Router();

const contributionsPath = path.join(__dirname, '../','public','contributions');

//expose this endpoint for crazyerics. allows uploading screenshot data
router.post('/contribute/titlescreen', (req, res, next) => {
    
    var formdata = req.body.cxhr; //this name means nothing, but it MUST be sent by the client of course

    if (!formdata) {
        return res.json();
    }

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    Titlescreen.Set(formdata, (err, response) => {
        if (err) {
            return res.json();
        }
        res.json(response);
    });
});

router.get('/titlescreen', (req, res, next) => {
    
    var gk = req.query.gk;

    if (!gk) {
        return res.json();
    }

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    Titlescreen.Get(gk, (err, response) => {
        if (err) {
            return res.json();
        }
        res.json(response);
    });
});

module.exports = router;
