'use strict';

class DevCommand extends require('egg-bin/lib/cmd/dev') {
  constructor(rawArgv) {
    super(rawArgv);
    this.usage = 'Usage: midway-bin dev [dir] [options]';
    this.defaultPort = process.env.PORT || 7001;
  }

  * run(context) {
    context.argv.framework = 'nbomb';
    context.execArgvObj.require.push(require.resolve('egg-ts-helper/register'));

    yield super.run(context);
  }
}

module.exports = DevCommand;
