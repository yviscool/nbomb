'use strict';

export enum RouteParamTypes{
  QUERY,
  BODY,
  PARAM,
  CONTEXT,
  REQUEST,
  RESPONSE,
  HEADERS,
  SESSION,
  FILE,
  FILES,
  FILESTREAM,
  FILESSTREAM,
  CUSTOM,
};

export enum RequestMethod  {
  GET,
  POST,
  PUT,
  DELETE,
  PATCH,
  ALL,
  OPTIONS,
  HEAD,
};

// egg router
export const REST_MAP = {
  index: {
    suffix: '',
    method: 'GET',
  },
  new: {
    namePrefix: 'new_',
    member: true,
    suffix: 'new',
    method: 'GET',
  },
  create: {
    suffix: '',
    method: 'POST',
  },
  show: {
    member: true,
    suffix: ':id',
    method: 'GET',
  },
  edit: {
    member: true,
    namePrefix: 'edit_',
    suffix: ':id/edit',
    method: 'GET',
  },
  update: {
    member: true,
    namePrefix: '',
    suffix: ':id',
    method: [ 'PATCH', 'PUT' ],
  },
  destroy: {
    member: true,
    namePrefix: 'destroy_',
    suffix: ':id',
    method: 'DELETE',
  },
};

export const PATH_METADATA = '__pathMetadata__';
export const METHOD_METADATA = '__methodMetadata__';
export const ROUTE_NAME_METADATA = '__routeNameMetadata__';

export const GUARDS_METADATA = '__guardsMetadata__';
export const PIPES_METADATA = '__pipesMetadata__';
export const INTERCEPTORS_METADATA = '__interceptorMetadata__';
export const EXCEPTION_FILTERS_METADATA = '__exceptionFilters__';
export const FILTER_CATCH_EXCEPTIONS = '__filterCatchExceptions__';

export const ROUTE_ARGS_METADATA = '__routeArgsMetadata__';
export const RENDER_METADATA = '__renderMetadata__';
export const HEADER_METADATA = '__headerMetadata__';
export const HTTP_CODE_METADATA = '__httpCode__';
export const PARAMTYPES_METADATA = 'design:paramtypes';
export const SELF_DECLARED_DEPS_METADATA = 'self:paramtypes';