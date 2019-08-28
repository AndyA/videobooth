"use strict";

const { series, parallel, src, dest } = require("gulp");
const babelify = require("babelify");
const uglify = require("gulp-uglify");
const browserify = require("browserify");
const source = require("vinyl-source-stream");
const buffer = require("vinyl-buffer");
const sourcemaps = require("gulp-sourcemaps");
const log = require("gulplog");

const ENV = "development";

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

function bundle() {
  return webCode(
    browserify({ entries: "lib/web/app.js", debug: true })
      .transform("babelify", { presets: ["@babel/preset-env"] })
      .bundle()
      .pipe(source("vb.js"))
      .pipe(buffer())
  ).pipe(dest("www/js/"));
}

module.exports = { bundle };
