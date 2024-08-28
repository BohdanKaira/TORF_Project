import { src, dest, watch, series, parallel } from 'gulp';
import browserSync from 'browser-sync';
import gulpSass from 'gulp-sass';
import * as sass from 'sass';
import autoprefixer from 'gulp-autoprefixer';
import rename from 'gulp-rename';
import fileInclude from 'gulp-file-include';
import terser from 'gulp-terser';
import concat from 'gulp-concat';
import imagemin from 'gulp-imagemin';
import avif from 'gulp-avif';
import webp from 'gulp-webp';
import newer from 'gulp-newer';
import ttf2woff2 from 'gulp-ttf2woff2';
import fonter from 'gulp-fonter-2';
import clean from 'gulp-clean';
import ghPages from 'gulp-gh-pages';

const SRC_ASSETS = './src/assets/';
const DIST_ASSETS = './dist/assets/';

function serve() {
  browserSync.init({
    server: {
      baseDir: './dist/',
    },
  });

  watch(SRC_ASSETS + 'scss/**/*.scss', buildStyles);
  watch(SRC_ASSETS + 'js/*.js', buildScripts);
  watch(SRC_ASSETS + 'js/pages/*.js', buildPageScripts);
  watch(SRC_ASSETS + 'images/*', modernImages);
  watch('./src/**/*.html', buildHTML);
}

function buildStyles() {
  return src(SRC_ASSETS + 'scss/**/*.scss')
    .pipe(gulpSass(sass)({ outputStyle: 'compressed' }).on('error', gulpSass(sass).logError))
    .pipe(rename({ suffix: '.min' }))
    .pipe(
      autoprefixer({
        grid: true,
        flex: true,
        overrideBrowserslist: ['last 5 versions'],
        cascade: true,
      })
    )
    .pipe(dest(DIST_ASSETS + 'css/'))
    .pipe(browserSync.stream());
}

function buildHTML() {
  return src('src/*.html')
    .pipe(
      fileInclude({
        prefix: '@@',
        basepath: '@file',
      })
    )
    .pipe(dest('dist'))
    .pipe(browserSync.stream());
}

function buildScripts() {
  return src(SRC_ASSETS + 'js/*.js')
    .pipe(concat('all.js'))
    .pipe(terser())
    .pipe(rename('all.min.js'))
    .pipe(dest(DIST_ASSETS + 'js/'))
    .pipe(browserSync.stream());
}

function buildPageScripts() {
  return src(SRC_ASSETS + 'js/pages/*.js')
    .pipe(terser())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(dest(DIST_ASSETS + 'js/'))
    .pipe(browserSync.stream());
}

function modernImages() {
  return src([SRC_ASSETS + 'images/*.{png,jpg,jpeg}', '!' + SRC_ASSETS + 'images/*.svg'])
    .pipe(newer(DIST_ASSETS + 'images/'))
    .pipe(avif({ quality: 50 }))
    .pipe(src([SRC_ASSETS + 'images/*.{png,jpg,jpeg}', '!' + SRC_ASSETS + 'images/*.svg']))
    .pipe(newer(DIST_ASSETS + 'images/'))
    .pipe(webp())
    .pipe(src(SRC_ASSETS + 'images/*.{png,jpg,jpeg,svg}'))
    .pipe(newer(DIST_ASSETS + 'images/'))
    .pipe(imagemin())
    .pipe(dest(DIST_ASSETS + 'images/'));
}

function convertFonts() {
  return src(SRC_ASSETS + 'fonts/**/*.*')
    // .pipe(fonter({ formats: ['woff', 'ttf'] }))
    // .pipe(src(SRC_ASSETS + 'fonts/**/*.ttf'))
    .pipe(ttf2woff2())
    .pipe(dest(DIST_ASSETS + 'fonts/'));
}

function cleanDist() {
  return src('./dist/*').pipe(clean({ force: true }));
}

function moveFavicon() {
  return src('./src/favicon/*').pipe(dest('./dist/favicon/'));
}

function movePlugins() {
  return src(SRC_ASSETS + 'plugins/**/*').pipe(dest(DIST_ASSETS + 'plugins/'));
}

function deploy() {
  return src('./dist/**/*').pipe(ghPages());
}

const move = parallel(moveFavicon, movePlugins);

const build = series(cleanDist, parallel(buildHTML, buildStyles, buildScripts, buildPageScripts, modernImages, convertFonts, move));

export { serve, buildStyles, buildHTML, buildScripts, buildPageScripts, modernImages, cleanDist, convertFonts, move, build, deploy };

export const dev = series(build, serve);
