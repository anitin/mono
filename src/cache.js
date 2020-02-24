const findCacheDir = require('find-cache-dir');
const Cache = require("file-system-cache").default;

const cache = Cache({
  basePath: findCacheDir({name: '.'}),
  ns: "yarn-ws" 
});

process.nextTick(cache.load)

module.exports = {
  save: args => cache.save(args),
  get: key => cache.get(key)
}