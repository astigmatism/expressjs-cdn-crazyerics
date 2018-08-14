const config = require('config');

module.exports = new (function() {
    
    return {
        origin: function (origin, callback) {
            return callback(null, true);
            if (config.cors.whitelist.indexOf(origin) !== -1) {
                return callback(null, true)
            }
            return callback(new Error('Not allowed by CORS'));
        }
    }
});
