function __export(m) {
  for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
__export(require("nbomb-core"));

const Master = require('../cluster/master');

/**
 * current version of midway
 * @member {String} Midway#VERSION
 */
exports.VERSION = require('../package.json').version;

/**
 * current release name
 * @member {String} Midway#RELEASE
 */
exports.RELEASE = 'VISION';

/**
 * debug for vscode
 */
exports.startCluster = function startCluster(options, callback) {
  new Master(options).ready(callback);
}
