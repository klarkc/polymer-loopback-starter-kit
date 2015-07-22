'use strict';

// Include Gulp & Tools We'll Use
var gulp = require('gulp');
var path = require('path');
var browserify = require('browserify');
var boot = require('loopback-boot');
var fs = require('fs');

var rootPath = path.resolve(__dirname, '../');

// Build lbclient browser bundle
gulp.task('lbclient', function (done) {
    var b = browserify({
        basedir: path.resolve(rootPath, 'client/loopback')
    });
    b.require(path.resolve(rootPath, 'client/loopback/index.js'), {
        expose: 'lbclient'
    });
    try {
        boot.compileToBrowserify({
            appRootDir: path.resolve(rootPath,
                'client/loopback')
        }, b);
    } catch (e) {
        throw e;
    }

    var target = fs.createWriteStream(path.resolve(rootPath, 'client/scripts/bundle.js'));
    target
        .on('error', done)
        .on('close', done);
    b.bundle().pipe(target);
});
