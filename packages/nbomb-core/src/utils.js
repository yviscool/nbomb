const is = require('is-type-of');

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

const MissingRequiredDependency = (name, reason) =>
  `The "${name}" package is missing. Please, make sure to install this library ($ npm install ${name} / or require)  to take advantage of ${reason}.`;

exports.getParamNames = function getParamNames(func) {
  const fnStr = func.toString().replace(STRIP_COMMENTS, '');
  let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  if (result === null) {
    result = [];
  }
  return result;
}

/**
 * Find methods on a given object
 *
 * @param {*} obj - object to enumerate on
 * @returns {string[]} - method names
 */
exports.getMethodNames = function getMethodNames(obj) {
  const enumerableOwnKeys = Object.keys(obj);
  const ownKeysOnObjectPrototype = Object.getOwnPropertyNames(Object.getPrototypeOf({}));
  // methods on obj itself should be always included
  const result = enumerableOwnKeys.filter(k => typeof obj[k] === 'function');

  // searching prototype chain for methods
  let proto = obj;
  do {
    proto = Object.getPrototypeOf(proto);
    const allOwnKeysOnPrototype = Object.getOwnPropertyNames(proto);
    // get methods from es6 class
    allOwnKeysOnPrototype.forEach(k => {
      if (typeof obj[k] === 'function' && k !== 'constructor') {
        result.push(k);
      }
    });
  }
  while (proto && proto !== Object.prototype);

  // leave out those methods on Object's prototype
  return result.filter(k => {
    return ownKeysOnObjectPrototype.indexOf(k) === -1;
  });
}

exports.isTypeScriptEnvironment = function isTypeScriptEnvironment() {
  return !!require.extensions['.ts'];
}




exports.loadPackage = function loadPackage(packageName, context) {
  try {
    return require(packageName);
  } catch (e) {
    console.error(MissingRequiredDependency(packageName, context));
    process.exit(1);
  }
};

exports.safeRequire = function safeRequire(packageName) {
  try {
    return require(packageName);
  } catch (e) {
    return undefined;
  }
};

// get object properties
// path(['a', 'b'], { a: { b: 1 } }) => 1
exports.path =  function path(pathArr, obj) {
  if (arguments.length === 1) {
    return function (objHolder) {
      return path(pathArr, objHolder);
    };
  }
  if (is.nullOrUndefined(obj)) {
    return undefined;
  }
  let willReturn = obj;
  let counter = 0;

  const pathArrValue = is.string(pathArr) ? pathArr.split('.') : pathArr;

  while (counter < pathArrValue.length) {
    if (is.nullOrUndefined(willReturn)) {
      return undefined;
    }
    willReturn = willReturn[pathArrValue[counter]];
    counter++;
  }

  return willReturn;
};