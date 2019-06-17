'use strict';
import * as is from 'is-type-of';
import { loadPackage } from '../utils';
import { BadRequestException } from '../exceptions/exception';

interface ClassTransformOptions {
  strategy?: 'excludeAll' | 'exposeAll';
  groups?: string[];
  version?: number;
  excludePrefixes?: string[];
  ignoreDecorators?: boolean;
  targetMaps?: any[];
  enableCircularCheck?: boolean;
}
interface ValidatorOptions {
  skipMissingProperties?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  groups?: string[];
  dismissDefaultMessages?: boolean;
  validationError?: {
      target?: boolean;
      value?: boolean;
  };
  forbidUnknownValues?: boolean;
}

interface ValidationPipeOptions extends ValidatorOptions {
  transform?: boolean;
  disableErrorMessages?: boolean;
  transformOptions?: ClassTransformOptions;
  exceptionFactory?: (errors: []) => any;
}

let classValidator:any = {};
let classTransformer:any = {};

export class ValidationPipe {

  protected isTransformEnabled: boolean;
  protected isDetailedOutputDisabled?: boolean;
  protected validatorOptions: ValidatorOptions;
  protected transformOptions: ClassTransformOptions;

  constructor(options : any = {}) {
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
