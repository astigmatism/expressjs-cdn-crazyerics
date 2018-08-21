# Here's an autostart script file!
# requires pm2. pathing is specific for the location of the app.js file
# use cron for start up: "crontab -e" and add "@reboot /path/to/script"

cd /media/data/expressjs-cdn-crazyerics/
pm2 start app.js --name cdn -i -1