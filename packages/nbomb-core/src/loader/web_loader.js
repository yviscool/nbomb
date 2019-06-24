// import { EggRouter as Router } from '@eggjs/router';
const assert = require('assert');
const is = require('is-type-of');
const inflection = require('inflection');

const { ContextCreator, ExceptionHanlder, RouterExecutionContext, RouterParamFactory, RouterProxy } = require('../proxy');

const { RequestMethod, REST_MAP, PRIORITY_METADATA } = require('./constants');
const { path: utilpath, safeRequire } = require('../utils');
const FileLoader =  require('./file_loader');
const  MiddlewaresConsumer  = require('./middleware');

// import * as extend from 'extend2';

const EggLoader = require('egg-core').EggLoader;
const EggFileLoader = require('egg-core/lib/loader/file_loader');

const EggRouter = safeRequire('egg-core/lib/utils/router') || require('@eggjs/router').EggRouter;

const ConfigValidator = {

  validate(config) {
    return {
      globalPipes: this.validPipes(config.globalPipes),
      globalGuards: this.validGuards(config.globalGuards),
      globalFilters: this.validFilters(config.globalFilters),
      globalInterceptors: this.validInterceptors(config.globalInterceptors),
    };
  },

  validPipes(pipes = []) {
    assert(Array.isArray(pipes), 'global pipes should be array');
    return pipes.filter(pipe => pipe && (is.function(pipe) || is.function(pipe.transform)));
  },

  validGuards(guards = []) {
    assert(Array.isArray(guards), 'global guards should be array');
    return guards.filter(guard => guard && (is.function(guard) || is.function(guard.canActivate)));
  },

  validFilters(filters = []) {
    assert(Array.isArray(filters), 'global filters should be array');
    return filters.filter(filter => filter && (is.function(filter) || is.function(filter.catch)));
  },

  validInterceptors(interceptors = []) {
    assert(Array.isArray(interceptors), 'global interceptors should be array');
    return interceptors.filter(interceptor => interceptor && (is.function(interceptor) || is.function(interceptor.intercept)));
  },

};

class NukeWebLoader extends EggLoader {

  constructor(options) {

    super(options);

    this.reflector = {
      reflectClassMetadata(klass, metadataKey) {
        return Reflect.getMetadata(metadataKey, klass.constructor);
      },
      reflectMethodMetadata(klass, key, metadataKey) {
        return Reflect.getMetadata(metadataKey, klass, key);
      },
    }

    this.prioritySortRouters = [];
  }

  /**
   * 判断是否是 ts 模式，在构造器内就会被执行
   */
  get isTsMode() {
    return this.app.options.typescript;
  }

  get applicationContext() {
    return this.containerLoader.getApplicationContext();
  }

  get pluginContext() {
    return this.containerLoader.getPluginContext();
  }

  // // loadPlugin -> loadConfig -> afterLoadConfig
  loadConfig() {
    this.loadPlugin();
    super.loadConfig();
  }


  // overwrite 
  loadToApp(directory, property, opt) {

    const target = this.app[property] = {};
    opt = Object.assign({}, {
      directory,
      target,
      inject: this.app,
    }, opt);

    const timingKey = `Load "${String(property)}" to Application`;
    this.timing.start(timingKey);
    if (property === 'controller'){
      const fileLoader = new FileLoader(opt);
      fileLoader.load();
      this.container = fileLoader.getRouters();
    } else {
      new EggFileLoader(opt).load();
    }
    this.timing.end(timingKey);
  }


  createMethodsProxy() {

    const { container, reflector, config } = this;

    const globalFeatures = ConfigValidator.validate(config);

    const routerParamFactory = new RouterParamFactory();
    const contextCreator = new ContextCreator(globalFeatures, reflector);
    const routerProxy = new RouterProxy(contextCreator, ExceptionHanlder, routerParamFactory, reflector);
    const routerExecutionContext = new RouterExecutionContext(container, routerProxy, reflector);

    // create controller method proxy
    routerExecutionContext.createMethodsProxy();
    // initn routers globalprefix for middlewares
    MiddlewaresConsumer.init(container);

    return this;

  }

  resolveRouters() {

    for (const { routerPaths, routerMetadata, properties , metatype  } of this.container.values()) {

      const { name = '', prefix, isRestful } = routerMetadata || {};

      if (!routerPaths.length && !isRestful) continue;

      // prefix ='/xxx/' => '/xxx'
      let basePath = prefix.replace(/\/$/, '');
      //  prefix = '/' then tranfrom into ''
      basePath = basePath.length === 1 ? '' : basePath;

      const router = this.createEggRouter(basePath);

      for (const pathProperty of routerPaths) {
        const { path, method, routeName, requestMethod } = pathProperty;
        const targetcallback = this.getTargetCallback(properties, method);

        // console.log(properties)
        // console.log(method)
        // console.log(targetcallback)

        const routerMethod = this.getRouterMethod(router, requestMethod);
        const args = routeName ? [ routeName, path, targetcallback ] : [ path, targetcallback ];
        routerMethod(...args);
      }

      if (prefix && isRestful) {
        // resources verb
        this.register(properties, router, { name, prefix: '/' });
      }


      const priority = Reflect.getMetadata(PRIORITY_METADATA, metatype);

      this.prioritySortRouters.push({ priority, router });

      // // ensure egg.router.verb before egg.router.use()
      // this.app.beforeStart(() => {
      //   // app.router.use(globalPrefix + basePath, router.routes());
      //   this.app.router.use(router.routes());
      // });

    }

  }

  loadNukeController() {
      // implement @priority
      if (this.prioritySortRouters.length) {

        this.prioritySortRouters = this.prioritySortRouters.sort((routerA, routerB) => routerB.priority - routerA.priority);
  
        this.prioritySortRouters.forEach((prioritySortRouter) => {
          this.app.use(prioritySortRouter.router.routes());
        });
      }
  }

  register(properties, router, { name, prefix }) {

    for (const key in REST_MAP) {

      let formatedName;
      const action = this.getTargetCallback(properties, key);

      const opts = REST_MAP[key];

      if (!action) continue;

      if (opts.member) {
        formatedName = inflection.singularize(name);
      } else {
        formatedName = inflection.pluralize(name);
      }

      if (opts.namePrefix) {
        formatedName = opts.namePrefix + formatedName;
      }

      const path = opts.suffix ? `${prefix}${opts.suffix}` : prefix;
      const method = Array.isArray(opts.method) ? opts.method : [ opts.method ];
      router.register(path, method, action, { name: formatedName });
    }
  }

  getRouterMethod(router, method) {
    const methodName /* GET, POST..*/ = RequestMethod[method];
    return router[methodName].bind(router);
  }

  // get egg controller method
  getTargetCallback(properties, method) {
    properties.push(method);
    const targetCallback = utilpath(properties.join('.'), this.app.controller);
    properties.pop();
    return targetCallback;
  }

  /**
   * @param {string} basePath is @Controller(path) path
   * @return {EggRouter} EggRouter
   */
  createEggRouter(basePath) {
    if (basePath) {
      return new EggRouter({ sensitive: true, prefix: basePath }, this.app);
    }
    return new EggRouter({ sensitive: true }, this.app);
  }

}

module.exports = NukeWebLoader;

  