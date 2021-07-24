const fs = require("fs");
const rollup = require("rollup");
const terser = require("terser");
const path = require("path");
const builds = require("./config").getAllConfig();

function build(builds) {
  let built = 0;
  const total = builds.length;
  const next = () => {
    buildEntry(builds[built])
      .then(() => {
        built++;
        if (built < total) {
          next();
        }
      })
      .catch(logError);
  };

  next();
}

build(builds);

async function buildEntry(config) {
  const { output } = config;
  const { file } = output;
  const isProd = /(min|prod)\.js$/.test(file);
  const bundle = await rollup.rollup(config);
  const watcher = rollup.watch(config);
  watcher.on("event", async (event) => {
    if ((event.code === "END")) {
      const {
        output: [{ code }],
      } = await bundle.generate(output);
      if (isProd) {
        const minified = (await terser.minify(code)).code;
        return write(file, minified);
      } else {
        return write(file, code);
      }
    }
  });
}

function write(file, code) {
  return new Promise((resolve, reject) => {
    fs.writeFile(file, code, (err) => reject(err));
    report(file, code);
    resolve();
  });
}

function report(dist, code) {
  console.log(blue(path.relative(process.cwd(), dist)) + " " + getSize(code));
}

function getSize(code) {
  return (code.length / 1024).toFixed(2) + "kb";
}

function logError(e) {
  console.log(e);
}

function blue(str) {
  return "\x1b[1m\x1b[34m" + str + "\x1b[39m\x1b[22m";
}
