'use strict';
const is = require('is-type-of');
const { loadPackage } = require('../utils');
const { BadRequestException } = require('../exceptions/exception');

let classValidator = {};
let classTransformer = {};

module.exports = class ValidationPipe {

  constructor(options = {}) {
    const { transform, disableErrorMessages, ...validatorOptions } = options;
    const loadPkg = pkg => loadPackage(pkg, 'ValidationPipe');
    this.isTransformEnabled = !!transform;
    this.validatorOptions = validatorOptions;
    this.isDetailedOutputDisabled = disableErrorMessages;
    classValidator = loadPkg('class-validator');
    classTransformer = loadPkg('class-transformer');
  }

  async transform(value, metadata) {
    const { metatype } = metadata;
    if (!metatype || !this.toValidate(metadata)) {
      return value;
    }
    const entity = classTransformer.plainToClass(
      metatype,
      this.toEmptyIfNil(value)
    );
    const errors = await classValidator.validate(entity, this.validatorOptions);
    if (errors.length > 0) {
      throw new BadRequestException(
        this.isDetailedOutputDisabled ? undefined : errors
      );
    }
    return this.isTransformEnabled
      ? entity
      : Object.keys(this.validatorOptions).length > 0
        ? classTransformer.classToPlain(entity)
        : value;
  }

  toValidate(metadata) {
    const { metatype, type } = metadata;
    if (type.toLowerCase() === 'custom') {
      return false;
    }
    const types = [ String, Boolean, Number, Array, Object ];
    return !types.some(t => metatype === t) && !is.null(metatype);
  }

  toEmptyIfNil(value) {
    return is.null(value) ? {} : value;
  }
};