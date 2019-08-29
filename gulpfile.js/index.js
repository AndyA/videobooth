"use strict";

const { series, parallel, src, dest, watch } = require("gulp");
const babelify = require("babelify");
const uglify = require("gulp-uglify");
const browserify = require("browserify");
const sass = require("gulp-sass");
const source = require("vinyl-source-stream");
const buffer = require("vinyl-buffer");
const sourcemaps = require("gulp-sourcemaps");
const gls = require("gulp-live-server");
const log = require("gulplog");
const browserSync = require("browser-sync").create();
const mocha = require("gulp-mocha");

const ENV = "development";
//const ENV = "production";

function webCode(s) {
  switch (ENV) {
    case "development":
      return s
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(sourcemaps.write("./"));
      break;
    case "production":
      return s.pipe(uglify()).on("error", log.error);
    default:
      throw new Error("Unknown ENV: " + ENV);
  }
}

function js() {
  return webCode(
    browserify({ entries: "lib/app/vb.js", paths: ["lib"], debug: true })
      .transform("babelify", { presets: ["@babel/preset-env"] })
      .bundle()
      .pipe(source("vb.js"))
      .pipe(buffer())
  )
    .pipe(dest("www/js/"))
    .pipe(browserSync.stream());
}

function scss() {
  return src("lib/app/*.{sass,scss}")
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(sass({ style: "compressed", includePaths: "lib/sass" }))
    .pipe(sourcemaps.write("./"))
    .pipe(dest("www/css/"))
    .pipe(browserSync.stream());
}

async function watchFiles() {
  watch(["lib/{app,common,web}/**/*.js"], js);
  watch(["lib/{app,sass}/**/*.{sass,scss}"], scss);
}

async function sync() {
  browserSync.init({ proxy: "http://localhost:31793" });
}

async function runServer() {
  const server = gls("bin/app.js", { env: { NODE_ENV: ENV } }, false);

  server.start();

  async function reloadViews() {
    browserSync.reload();
  }

  async function reloadApp() {
    browserSync.reload();
    server.start.bind(server)();
  }

  watch(["views/**/*.hbs"], reloadViews);
  watch(["bin/app.js", "lib/{common,srv}/**/*.js"], reloadApp);
}

function test() {
  return src("test/**/*.js").pipe(mocha({ reporter: "spec" }));
}

async function tdd() {
  watch(["test/**/*.js", "lib/**/*.js"], test);
}

const build = parallel(js, scss);

module.exports = {
  js,
  scss,
  build,
  test,
  tdd,
  watch: series(build, runServer, sync, watchFiles)
};
