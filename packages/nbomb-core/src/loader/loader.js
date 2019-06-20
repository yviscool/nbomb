const MidwayWebLoader  = require('./web_loader');

class AppWorkerLoader extends MidwayWebLoader {

  /**
   * Load all directories in convention
   * @since 1.0.0
   */
  load() {


    // app > plugin > core
    this.loadApplicationExtend();
    this.loadRequestExtend();
    this.loadResponseExtend();
    this.loadContextExtend();
    this.loadHelperExtend();

    // app > plugin
    this.loadCustomApp();


    // app > plugin
    this.loadService();
    // app > plugin > core
    this.loadMiddleware();
    // app
    this.loadController();

    // extends
    this.createMethodsProxy();
    this.resolveRouters();

    // app
    this.loadRouter(); // Dependent on controllers



    this.loadCustomLoader();
  }

}

class AgentWorkerLoader extends MidwayWebLoader {

  load() {
    this.loadAgentExtend();
    this.loadContextExtend();

    this.loadCustomAgent();
  }

}

module.exports = {
  AppWorkerLoader,
  AgentWorkerLoader,
}