'use strict';

import 'reflect-metadata';
import * as is from 'is-type-of';
import { loadPackage } from '../utils';
import { map } from 'rxjs/operators';

const CLASS_SERIALIZER_OPTIONS = 'class_serializer:options';

const loadPkg = pkg => loadPackage(pkg, 'ClassSerializerInterceptor');

export class ClassSerializerInterceptor {

  private classTransformer: any =  loadPkg('class-transformer');

  intercept(context, call$) {
    const options = this.getContextOptions(context);
    return call$.pipe(
      map(res => this.serialize(res, options))
    );
  }

  serialize(response, options) {
    const isArray = Array.isArray(response);
    if (!is.object(response) && !isArray) {
      return response;
    }
    return isArray
      ? response.map(item => this.transformPlain(item, options))
      : this.transformPlain(response, options);
  }

  transformPlain(plainOrClass, options) {
    return plainOrClass && plainOrClass.constructor !== Object
      ? this.classTransformer.classToPlain(plainOrClass, options)
      : plainOrClass;
  }

  getContextOptions(context) {
    return (
      Reflect.getMetadata(CLASS_SERIALIZER_OPTIONS, context.getHandler()) ||
        Reflect.getMetadata(CLASS_SERIALIZER_OPTIONS, context.getClass())
    );
  }

};

