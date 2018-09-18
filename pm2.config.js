module.exports = {
    apps : [
        {
            name: "crazyerics-cdn",
            script: "/home/astigmatism/expressjs-cdn-crazyerics/app.js",
            env: {
                "NODE_ENV": "production"
            },
            instances: -1,
            exec_mode: "cluster"
        }
    ]
}