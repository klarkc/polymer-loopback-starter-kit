'use strict';

// Include Gulp & Tools We'll Use
var gulp = require('gulp');
var path = require('path');

var rootPath = path.resolve(__dirname, '../');

gulp.task('serve:server', function () {
    var loopback = require('loopback');
    var boot = require('loopback-boot');

    var app = module.exports = loopback();

    app.start = function () {
        // start the web server
        return app.listen(function () {
            app.emit('started');
            console.log('Application REST server listening at: %s', app.get('url'));
        });
    };

    // Bootstrap the application, configure models, datasources and middleware.
    // Sub-apps like REST API are mounted via boot scripts.
    boot(app, path.resolve(rootPath, 'server'), function (err) {
        if (err) throw err;
        // start the server if `$ node server.js`
        app.start();
    });
});

gulp.task('serve', ['serve:client', 'serve:server']);
