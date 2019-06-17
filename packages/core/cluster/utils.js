'use strict';

const path = require('path');

exports.isTypeScriptEnvironment = () => {
  return !!require.extensions['.ts'];
};

/**
 * add typescript and baseDir
 * @param options
 * @returns {*}
 */
exports.formatOptions = (options) => {
  options.framework = options.framework || '@nuke/core';
  if(!options.baseDir) {
    options.baseDir = process.cwd();
  }

  if(options.typescript === undefined) {
    /* istanbul ignore else*/
    if(exports.isTypeScriptEnvironment()) {
      options.typescript = true;
    } else {
      const pkg = require(path.join(options.baseDir, 'package.json'));
      if(pkg['dependencies'] && pkg['dependencies']['typescript']) {
        options.typescript = true;
      }
      if(pkg['devDependencies'] && pkg['devDependencies']['typescript']) {
        options.typescript = true;
      }
    }
  }

  return options;
};
