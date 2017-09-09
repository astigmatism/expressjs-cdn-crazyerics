var express = require('express');
var router = express.Router();


router.post('/games', (req, res, next) => {
    res.render('hello world');
});

module.exports = router;
