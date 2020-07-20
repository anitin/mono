// Background: https://github.com/sequelize/sequelize/issues/4883#issuecomment-198231939
process.env.BLUEBIRD_DEBUG = 0;
const findCacheDir = require("find-cache-dir");
const Cache = require("file-system-cache").default;

const cache = Cache({
  basePath: findCacheDir({ name: "." }),
  ns: "yarn-ws",
});

module.exports = {
  save: (args) => Promise.resolve(cache.save(args)),
  get: (key) => Promise.resolve(cache.get(key)),
};
