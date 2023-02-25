const sass = require("gulp-sass")(require("sass"));
const { src, watch, dest, series } = require("gulp");
const purgeCSS = require("gulp-purgecss");


function buildStylesDev() {
  return src("./src/public/scss/**/*.scss")
    .pipe(sass.sync({
      outputStyle: "expanded",
      sourceComments: true
    }))
    .pipe(dest("./src/public/css"));
}


function buildStylesProd() {
  return src("./src/public/scss/**/*.scss")
    .pipe(sass.sync({
      outputStyle: "compressed",
      sourceComments: false
    }))
    .pipe(purgeCSS({ content: ["*.html"] }))
    .pipe(dest("./src/public/css"));
}

function watchStylesDev() {
  watch(["./src/public/scss/**/*.scss", "./views/**/*.html"], { delay: 500 }, buildStylesDev);
}

exports.default = series(buildStylesDev, watchStylesDev);
