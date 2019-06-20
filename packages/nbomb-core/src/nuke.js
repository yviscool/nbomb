const { Agent, Application } = require('egg');
// import { Logger } from 'egg-logger';
const { AgentWorkerLoader, AppWorkerLoader } = require('./loader/loader');
const path = require('path');

const NUKE_PATH = path.dirname(__dirname);

const EGG_LOADER = Symbol.for('egg#loader');
const EGG_PATH = Symbol.for('egg#eggPath');

class NukeApplication extends Application {

  get [EGG_LOADER]() {
    return AppWorkerLoader;
  }

  get [EGG_PATH]() {
    return NUKE_PATH;
  }
}

class NukeAgent extends Agent {

  get [EGG_LOADER]() {
    return AgentWorkerLoader;
  }

  get [EGG_PATH]() {
    return NUKE_PATH;
  }

}


module.exports = {
   Application: NukeApplication,
   Agent: NukeAgent
};
