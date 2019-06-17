// import { EggRouter as Router } from '@eggjs/router';
import * as fs from 'fs';
import * as is from 'is-type-of';
import * as path from 'path';
import * as assert  from 'assert';
import * as inflection from 'inflection';

import { ContextCreator, ExceptionHanlder, RouterExecutionContext, RouterParamFactory, RouterProxy } from '../mixin';

import { RequestMethod, REST_MAP } from '../loader/constants';
import { EggAppInfo } from 'egg';
import { isTypeScriptEnvironment, path as utilpath, safeRequire } from '../utils';
import { FileLoader } from './file_loader';
import { MiddlewaresConsumer } from './middleware';

import * as extend from 'extend2';

const EggLoader = require('egg-core').EggLoader;
const EggFileLoader = require('egg-core/lib/loader/file_loader');

const EggRouter = safeRequire('egg-core/lib/utils/router') || require('@eggjs/router').EggRouter;


const TS_SRC_DIR = 'src';
const TS_TARGET_DIR = 'dist';

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

export class MidwayWebLoader extends EggLoader {
  public baseDir: string;
  public appDir: string;
  public appInfo: EggAppInfo;
  public container: Map<string, any>;
  public reflector: any;

  // private controllerIds: string[] = [];
  // private prioritySortRouters: Array<{
  //   priority: number,
  //   router: Router,
  // }> = [];
  // private containerLoader;

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
  protected loadConfig() {
    this.loadPlugin();
    super.loadConfig();
  }

  // Get the real plugin path
  protected getPluginPath(plugin) {
    if (plugin.path) {
      return plugin.path;
    }

    const name = plugin.package || plugin.name;
    const lookupDirs = [];

    // 尝试在以下目录找到匹配的插件
    //  -> {APP_PATH}/node_modules
    //    -> {EGG_PATH}/node_modules
    //      -> $CWD/node_modules
    lookupDirs.push(path.join(this.appDir, 'node_modules'));

    // 到 egg 中查找，优先从外往里查找
    for (let i = this.eggPaths.length - 1; i >= 0; i--) {
      const eggPath = this.eggPaths[i];
      lookupDirs.push(path.join(eggPath, 'node_modules'));
    }

    // should find the $cwd/node_modules when test the plugins under npm3
    lookupDirs.push(path.join(process.cwd(), 'node_modules'));

    if (process.env.PLUGIN_PATH) {
      lookupDirs.push(path.join(process.env.PLUGIN_PATH, 'node_modules'));
    }

    for (let dir of lookupDirs) {
      dir = path.join(dir, name);
      if (fs.existsSync(dir)) {
        return fs.realpathSync(dir);
      }
    }

    throw new Error(`Can not find plugin ${name} in "${lookupDirs.join(', ')}"`);
  }

  protected registerTypescriptDirectory() {
    const app = this.app;
    // 处理 ts 的初始路径
    this.appDir = this.baseDir = app.options.baseDir;
    if (this.isTsMode) {
      let dirSuffix = app.options.targetDir || TS_TARGET_DIR;
      if (isTypeScriptEnvironment()) {
        dirSuffix = app.options.srcDir || TS_SRC_DIR;
        // 打开 egg 加载 ts 的开关
        process.env.EGG_TYPESCRIPT = 'true';
      }

      const dir = path.join(app.options.baseDir, dirSuffix);
      this.baseDir = app.options.baseDir = this.options.baseDir = dir;

      this.options.logger.info(`in typescript current dir change to ${dir}`);
    }
  }

  protected getEggPaths() {
    if (!this.appDir) {
      // register appDir here
      this.registerTypescriptDirectory();
    }
    return super.getEggPaths();
  }

  protected getServerEnv() {
    let serverEnv;

    const envPath = path.join(this.appDir, 'config/env');
    if (fs.existsSync(envPath)) {
      serverEnv = fs.readFileSync(envPath, 'utf8').trim();
    }

    if (!serverEnv) {
      serverEnv = super.getServerEnv();
    }

    return serverEnv;
  }

  protected getAppInfo() {
    if (!this.appInfo) {
      const appInfo = super.getAppInfo();
      // ROOT == HOME in prod env
      this.appInfo = extend(true, appInfo, {
        root: appInfo.env === 'local' || appInfo.env === 'unittest' ? this.appDir : appInfo.root,
        appDir: this.appDir,
      });
    }
    return this.appInfo;
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


    const globalFeatures = ConfigValidator.validate(this.config);

    const {  container, reflector } = this;
    const routerParamFactory = new RouterParamFactory();
    const contextCreator = new ContextCreator(globalFeatures, reflector);
    const routerProxy = new RouterProxy(contextCreator, ExceptionHanlder, routerParamFactory, reflector);
    const routerExecutionContext = new RouterExecutionContext(container, routerProxy, reflector);

    // create controller method proxy
    routerExecutionContext.createMethodsProxy();
    // initn routers globalprefix for middlewares
    MiddlewaresConsumer.init(container,"");

    return this;

  }

  resolveRouters() {

    for (const { routerPaths, routerMetadata, properties /* metatype*/ } of this.container.values()) {

      const { name = '', prefix, isRestful } = (routerMetadata || {}) as any;

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

      // // prefix ='/xxx/' => '/xxx'
      // let basePath = prefix.replace(/\/$/, '');
      // //  prefix = '/' then tranfrom into ''
      // basePath = basePath.length === 1 ? '' : basePath;

      // set globalPrefix
      // const globalPrefix = globalPrefix ? globalPrefix : '';
      // ensure egg.router.verb before egg.router.use()
      this.app.beforeStart(() => {
        // app.router.use(globalPrefix + basePath, router.routes());
        this.app.router.use(router.routes());
      });

    }

  }

  protected register(properties, router, { name, prefix }) {

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
    const methodName /* get, post..*/ = RequestMethod[method];
    return router[methodName.toLocaleLowerCase()].bind(router);
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


  // loadController() {
  //   this.app.logger.info('[egg-pig] prevent default loadController success.');
  // }

  // protected loadApplicationContext() {
  //   // this.app.options.container 测试用例编写方便点
  //   const containerConfig = this.config.container || this.app.options.container || {};
  //   if (!containerConfig.loadDir) {
  //     // 如果没有配置，默认就把扫描目录改到 /src or /dist
  //     containerConfig.baseDir = this.baseDir;
  //   }
  //   // 在 super constructor 中会调用到getAppInfo，之后会被赋值
  //   // 如果是typescript会加上 dist 或者 src 目录
  //   this.containerLoader = new ContainerLoader({
  //     baseDir: this.appDir,
  //     isTsMode: this.isTsMode
  //   });
  //   this.containerLoader.initialize();
  //   this.applicationContext.registerObject('appDir', this.appDir);
  //   // 如果没有关闭autoLoad 则进行load
  //   this.containerLoader.loadDirectory(containerConfig);

  //   // register handler for container
  //   this.containerLoader.registerAllHook(MidwayHandlerKey.CONFIG, (key) => {
  //     return this.config[key];
  //   });

  //   this.containerLoader.registerAllHook(MidwayHandlerKey.PLUGIN, (key) => {
  //     return this.app[key] || this.pluginContext.get(key);
  //   });

  //   this.containerLoader.registerAllHook(MidwayHandlerKey.LOGGER, (key) => {
  //     if (this.app.getLogger) {
  //       return this.app.getLogger(key);
  //     }
  //     return this.options.logger;
  //   });
  // }

  // protected async preRegisterRouter(target, controllerId) {
  //   const app = this.app;
  //   const controllerOption: ControllerOption = getClassMetadata(CONTROLLER_KEY, target);
  //   let newRouter;
  //   if (controllerOption.prefix) {
  //     newRouter = new Router({
  //       sensitive: true,
  //     }, app);
  //     newRouter.prefix(controllerOption.prefix);
  //     // implement middleware in controller
  //     const middlewares = controllerOption.routerOptions.middleware;
  //     await this.handlerWebMiddleware(middlewares, (middlewareImpl: KoaMiddleware) => {
  //       newRouter.use(middlewareImpl);
  //     });

  //     // implement @get @post
  //     const webRouterInfo: RouterOption[] = getClassMetadata(WEB_ROUTER_KEY, target);
  //     if (webRouterInfo && typeof webRouterInfo[Symbol.iterator] === 'function') {
  //       for (const webRouter of webRouterInfo) {
  //         // get middleware
  //         const middlewares = webRouter.middleware;
  //         const methodMiddlwares = [];

  //         await this.handlerWebMiddleware(middlewares, (middlewareImpl: KoaMiddleware) => {
  //           methodMiddlwares.push(middlewareImpl);
  //         });

  //         const routerArgs = [
  //           webRouter.routerName,
  //           webRouter.path,
  //           ...methodMiddlwares,
  //           this.generateController(`${controllerId}.${webRouter.method}`)
  //         ].concat(methodMiddlwares);

  //         // apply controller from request context
  //         newRouter[webRouter.requestMethod].apply(newRouter, routerArgs);
  //       }
  //     }
  //   }

  //   // sort for priority
  //   if (newRouter) {
  //     const priority = getClassMetadata(PRIORITY_KEY, target);
  //     this.prioritySortRouters.push({
  //       priority: priority || 0,
  //       router: newRouter,
  //     });
  //   }
  // }

  // private async handlerWebMiddleware(middlewares, handlerCallback) {
  //   if (middlewares && middlewares.length) {
  //     for (const middleware of middlewares) {
  //       if (typeof middleware === 'function') {
  //         // web function middleware
  //         handlerCallback(middleware);
  //       } else {
  //         const middlewareImpl: WebMiddleware = await this.applicationContext.getAsync(middleware);
  //         if (middlewareImpl && middlewareImpl.resolve) {
  //           handlerCallback(middlewareImpl.resolve());
  //         }
  //       }
  //     }
  //   }
  // }

  // protected async refreshContext(): Promise<void> {
  //   await this.containerLoader.refresh();
  // }

  // /**
  //  * wrap controller string to middleware function
  //  * @param controllerMapping like xxxController.index
  //  */
  // public generateController(controllerMapping: string) {
  //   const mappingSplit = controllerMapping.split('.');
  //   const controllerId = mappingSplit[0];
  //   const methodName = mappingSplit[1];
  //   return async (ctx, next) => {
  //     const controller = await ctx.requestContext.getAsync(controllerId);
  //     return controller[methodName].call(controller, ctx, next);
  //   };
  // }

  // public async loadMidwayController(): Promise<void> {
  //   const controllerModules = listModule(CONTROLLER_KEY);

  //   // implement @controller
  //   for (const module of controllerModules) {
  //     const providerId = getProviderId(module);
  //     if (providerId) {
  //       if (this.controllerIds.indexOf(providerId) > -1) {
  //         throw new Error(`controller identifier [${providerId}] is exists!`);
  //       }
  //       this.controllerIds.push(providerId);
  //       await this.preRegisterRouter(module, providerId);
  //     }
  //   }

  //   // implement @priority
  //   if (this.prioritySortRouters.length) {
  //     this.prioritySortRouters = this.prioritySortRouters.sort((routerA, routerB) => {
  //       return routerB.priority - routerA.priority;
  //     });

  //     this.prioritySortRouters.forEach((prioritySortRouter) => {
  //       this.app.use(prioritySortRouter.router.middleware());
  //     });
  //   }
  // }

}
