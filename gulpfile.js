const autoprefixer = require('autoprefixer');
const browser = require('browser-sync');
const cssnano = require('cssnano');
const del = require('del');
const { src, dest, watch, parallel, series } = require('gulp');
const html = require('gulp-htmlmin');
const image = require('gulp-image');
const mmq = require('gulp-merge-media-queries');
const postcss = require('gulp-postcss');
const sass = require('gulp-sass');
const sourceMap = require('gulp-sourcemaps');
const gulpif = require('gulp-if');
const webp = require('gulp-webp');
const { path, directories } = require('./pathes');

const development = !process.argv.includes('--prod');

function CSS() {
  return src(path.css.src)
    .pipe(gulpif(development, sourceMap.init()))
    .pipe(sass().on('error', sass.logError))
    .pipe(mmq())
    .pipe(postcss([autoprefixer, require('webp-in-css/plugin'), cssnano]))
    .pipe(gulpif(development, sourceMap.write()))
    .pipe(gulpif(development, dest(path.css.dev), dest(path.css.public)))
    .pipe(gulpif(development, browser.stream()));
}

function optimizeImages() {
  return src(path.images.src)
    .pipe(gulpif(!development, image()))
    .pipe(gulpif(development, dest(path.images.dev), dest(path.images.public)))
    .pipe(src(path.images.src))
    .pipe(webp({quality: 100}))
    .pipe(
      gulpif(
        development,
        dest(path.images.dev),
        dest(path.images.public)
      )
    );
}

function fonts() {
  return src(path.fonts.src).pipe(
    gulpif(development, dest(path.fonts.dev), dest(path.fonts.public))
  );
}

function htmlMin() {
  return src(path.html.src)
    .pipe(gulpif(!development, html({ collapseWhitespace: true })))
    .pipe(gulpif(development, dest(path.html.dev), dest(path.html.public)));
}

function clean() {
  return del([
    directories.dev + directories.images,
    directories.dev + directories.fonts,
    directories.dev + directories.css,
    directories.dev + '*.html'
  ], {force: true});
}

function watchers() {
  watch(path.css.watcher, CSS);
  watch(path.html.watcher, htmlMin);
  watch(path.images.watcher, optimizeImages);
  watch(path.fonts.watcher, fonts);
}

function browserSync() {
  browser.init({
    server: directories.dev
  });

  watch(path.css.watcher).on('change', browser.reload);
  watch(path.html.watcher).on('change', browser.reload);
  watch(path.images.watcher).on('change', browser.reload);
  watch(path.fonts.watcher).on('change', browser.reload);
}

const beforeServer = parallel(htmlMin, CSS, optimizeImages, fonts);
const dev = development
  ? series(beforeServer, parallel(browserSync, watchers))
  : series(clean, beforeServer);

exports.default = dev;

