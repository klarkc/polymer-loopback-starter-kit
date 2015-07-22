'use strict';

// Include Gulp & Tools We'll Use
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var merge = require('merge-stream');
var path = require('path');
var fs = require('fs');
var glob = require('glob');
var historyApiFallback = require('connect-history-api-fallback');

var AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];

var styleTask = function (stylesPath, srcs) {
    return gulp.src(srcs.map(function (src) {
            return path.join('client', stylesPath, src);
        }))
        .pipe($.changed(stylesPath, {
            extension: '.css'
        }))
        .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
        .pipe(gulp.dest('.tmp/' + stylesPath))
        .pipe($.if('*.css', $.cssmin()))
        .pipe(gulp.dest('dist/' + stylesPath))
        .pipe($.size({
            title: stylesPath
        }));
};

// Compile and Automatically Prefix Stylesheets
gulp.task('styles', function () {
    return styleTask('styles', ['**/*.css']);
});

gulp.task('elements', function () {
    return styleTask('elements', ['**/*.css']);
});

// Optimize Images
gulp.task('images', function () {
    return gulp.src('client/images/**/*')
        .pipe($.cache($.imagemin({
            progressive: true,
            interlaced: true
        })))
        .pipe(gulp.dest('dist/images'))
        .pipe($.size({
            title: 'images'
        }));
});

// Lint JavaScript
gulp.task('jshint', function () {
    return gulp.src([
      'client/scripts/**/*.js',
      'client/elements/**/*.js',
      'client/loopback/**/*.js',
      'client/elements/**/*.html'
    ])
        .pipe(reload({
            stream: true,
            once: true
        }))
        .pipe($.jshint.extract()) // Extract JS from .html files
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish'))
        .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});

// Copy All Files At The Root Level (app)
gulp.task('copy', function () {
    var app = gulp.src([
    'client/*',
    '!client/loopback',
    '!client/test',
    '!client/precache.json'
  ], {
        dot: true
    }).pipe(gulp.dest('dist'));

    var bower = gulp.src([
    'bower_components/**/*'
  ]).pipe(gulp.dest('dist/bower_components'));

    var elements = gulp.src(['client/elements/**/*.html'])
        .pipe(gulp.dest('dist/elements'));

    var swBootstrap = gulp.src(['bower_components/platinum-sw/bootstrap/*.js'])
        .pipe(gulp.dest('dist/elements/bootstrap'));

    var swToolbox = gulp.src(['bower_components/sw-toolbox/*.js'])
        .pipe(gulp.dest('dist/sw-toolbox'));

    var vulcanized = gulp.src(['client/elements/elements.html'])
        .pipe($.rename('elements.vulcanized.html'))
        .pipe(gulp.dest('dist/elements'));

    return merge(app, bower, elements, vulcanized, swBootstrap, swToolbox)
        .pipe($.size({
            title: 'copy'
        }));
});

// Copy Web Fonts To Dist
gulp.task('fonts', function () {
    return gulp.src(['client/fonts/**'])
        .pipe(gulp.dest('dist/fonts'))
        .pipe($.size({
            title: 'fonts'
        }));
});

// Scan Your HTML For Assets & Optimize Them
gulp.task('html', function () {
    var assets = $.useref.assets({
        searchPath: ['.tmp', 'client', 'dist']
    });

    return gulp.src(['client/**/*.html', '!client/{elements,test}/**/*.html'])
        // Replace path for vulcanized assets
        .pipe($.if('*.html', $.replace('elements/elements.html', 'elements/elements.vulcanized.html')))
        .pipe(assets)
        // Concatenate And Minify JavaScript
        .pipe($.if('*.js', $.uglify({
            preserveComments: 'some'
        })))
        // Concatenate And Minify Styles
        // In case you are still using useref build blocks
        .pipe($.if('*.css', $.cssmin()))
        .pipe(assets.restore())
        .pipe($.useref())
        // Minify Any HTML
        .pipe($.if('*.html', $.minifyHtml({
            quotes: true,
            empty: true,
            spare: true
        })))
        // Output Files
        .pipe(gulp.dest('dist'))
        .pipe($.size({
            title: 'html'
        }));
});

// Vulcanize imports
gulp.task('vulcanize', function () {
    var DEST_DIR = 'dist/elements';

    return gulp.src('dist/elements/elements.vulcanized.html')
        .pipe($.vulcanize({
            stripComments: true,
            inlineCss: true,
            inlineScripts: true
        }))
        .pipe(gulp.dest(DEST_DIR))
        .pipe($.size({
            title: 'vulcanize'
        }));
});


// Generate a list of files that should be precached when serving from 'dist'.
// The list will be consumed by the <platinum-sw-cache> element.
gulp.task('precache', function (callback) {
    var dir = 'dist';

    glob('{elements,scripts,styles}/**/*.*', {
        cwd: dir
    }, function (error, files) {
        if (error) {
            callback(error);
        } else {
            files.push('index.html', './', 'bower_components/webcomponentsjs/webcomponents-lite.min.js');
            var filePath = path.join(dir, 'precache.json');
            fs.writeFile(filePath, JSON.stringify(files), callback);
        }
    });
});

// Clean Output Directory
gulp.task('clean', del.bind(null, ['.tmp', 'dist', 'client/scripts/bundle.js']));

// Watch Files For Changes & Reload
gulp.task('serve:client', ['lbclient', 'styles', 'elements', 'images'], function () {
    browserSync({
        notify: false,
        ghostMode: false,
        snippetOptions: {
            rule: {
                match: '<span id="browser-sync-binding"></span>',
                fn: function (snippet) {
                    return snippet;
                }
            }
        },
        // Run as an https by uncommenting 'https: true'
        // Note: this uses an unsigned certificate which on first access
        //       will present a certificate warning in the browser.
        // https: true,
        server: {
            baseDir: ['.tmp', 'client'],
            middleware: [historyApiFallback()],
            routes: {
                '/bower_components': 'bower_components'
            }
        }
    });

    gulp.watch(['client/**/*.html'], reload);
    gulp.watch(['client/styles/**/*.css'], ['styles', reload]);
    gulp.watch(['client/elements/**/*.css'], ['elements', reload]);
    gulp.watch(['client/{scripts,elements}/**/*.js'], ['jshint']);
    gulp.watch(['client/loopback/**/*.js'], ['lbclient', 'jshint']);
    gulp.watch(['client/loopback/**/*.json'], ['lbclient', reload]);
    gulp.watch(['client/images/**/*'], reload);
});

// Build and serve the output from the dist build
gulp.task('serve:dist', ['default', 'serve'], function () {
    browserSync({
        notify: false,
        logPrefix: 'PSK',
        ghostMode: false,
        snippetOptions: {
            rule: {
                match: '<span id="browser-sync-binding"></span>',
                fn: function (snippet) {
                    return snippet;
                }
            }
        },
        // Run as an https by uncommenting 'https: true'
        // Note: this uses an unsigned certificate which on first access
        //       will present a certificate warning in the browser.
        // https: true,
        server: 'dist',
        middleware: [historyApiFallback()]
    });
});

// Build Production Files, the Default Task
gulp.task('default', ['clean'], function (cb) {
    runSequence(
        ['copy', 'styles'],
        'elements', 'lbclient', ['jshint', 'images', 'fonts', 'html'],
        'vulcanize',
        cb);
    // Note: add , 'precache' , after 'vulcanize', if your are going to use Service Worker
});

// Load tasks for web-component-tester
// Adds tasks for `gulp test:local` and `gulp test:remote`
require('web-component-tester').gulp.init(gulp);

// Load custom tasks from the `tasks` directory
try {
    require('require-dir')('tasks');
} catch (err) {}
