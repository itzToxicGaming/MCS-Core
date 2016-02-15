var Webserver = require('./webserver.js');
var log = require('./log.js');
var version = require('../package.json').version;
var crypto = require('crypto');

var Daemon = require('./database/daemon.js');
var Plugin = require('./database/plugin.js');
var World = require('./database/world.js');
var Servertype = require('./database/servertype.js');
var User = require("./database/user.js");

var mongoClient = require("./mongo.js");

var io = require('socket.io')(Webserver.getInstance({}).getWebserver());

io.on('connection', function(socket) {

    socket.on("clogin", function(data) {
        mongoClient.getUserModel().find({ username: data.username, session: data.session }, function(err, username) {
            if(!err) {
                if(username == data.username) {
                    loadListener();
                    socket.emit("clogin-result", { reason: "success" });
                } else {
                    socket.emit("clogin-result", { reason: "failure" });
                }
            } else {
                socket.emit("clogin-result", { reason: "failure" });
            }
        });
    });

    socket.on("login", function(data) {
        var hash = crypto.createHash('sha256');
        hash.setEncoding('hex');
        hash.write(data.password);
        hash.end();
        mongoClient.getUserModel().find({ username: data.username, password: hash.read() }, function(err, username, password) {
            if(!err) {
                if(username == data.username && password == hash.read()) {
                    var cookie = crypto.randomBytes(8).toString('hex');
                    socket.emit("login-result", { reason: "success", session: cookie });
                } else {
                    socket.emit("login-result", { reason: "failure" });
                }
            } else {
                socket.emit("login-result", { reason: "failure" });
            }
        });
    });

    var loadListener = function() {
        socket.on('req-file', function(data) {
            if(data.type === 'log') {
                socket.emit('log-req', log.getLog());
            } else if(data.type === "daemons") {
                socket.emit('daemons-req', Daemon.prototype.getDaemons());
            } else if(data.type === "plugins") {
                socket.emit('plugins-req', Plugin.prototype.getPlugins());
            } else if(data.type === "worlds") {
                //socket.emit('worlds-req', World.prototype.getWorlds());
            } else if(data.type === "servertypes") {
                //socket.emit('servertypes-req', Servertype.prototype.getServertypes());
            }
        });

        socket.on('req-info', function(data) {
            if(data.type === 'version') {
                socket.emit('version-req', {version_val: 'v' + version});
            } else if(data.type === 'startDate') {
                socket.emit('startDate-req', {date_val: Webserver.getInstance({}).getStartDate()});
            }
        });

        socket.on('add', function(data) {
            if(data.type === "daemon") {
                var newDaemon = new Daemon(data.name, data.ip, data.minport, data.maxport);
                newDaemon.save();

                Daemon.prototype.loadDaemons();
            } else if(data.type === "plugin") {
                var newPlugin = new Plugin(data.name, data.version, data.size, data.hash);
                newPlugin.save();

                Plugin.prototype.loadPlugins();
            } else if(data.type === "world") {
                /*var newWorld = new World(...);
                 newWorld.save();

                 World.prototype.loadWorlds();*/
            } else if(data.type === "servertype") {

            } else {
                log.warn("Unknown type to add!");
            }
        });
    };
});