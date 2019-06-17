'use strict';

import { HttpStatus } from "./constant";

function createHttpExceptionBody(message, error, statusCode) {
  return message ? { statusCode, error, message } : { statusCode, error };
}

export class HttpException extends Error {

  public readonly message: any;

  constructor(
    private readonly response : string | object,
    private readonly status: number
    ) {
    super();
    this.message = response;
    // this.response = response;
    // this.status = status;
  }

  public getResponse() : string | object {
    return this.response;
  }

  public getStatus() : number {
    return this.status;
  }
}


export  class ForbiddenException extends HttpException {
  constructor(message?: string | object | any, error = 'Forbidden') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.FORBIDDEN),
      HttpStatus.FORBIDDEN
    );
  }
};


export class BadRequestException extends HttpException {
  constructor(message?: string | object | any, error = 'Bad Request') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.BAD_REQUEST),
      HttpStatus.BAD_REQUEST
    );
  }
};

export class UnauthorizedException extends HttpException {
  constructor(message?: string | object | any, error = 'Unauthorized') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.UNAUTHORIZED),
      HttpStatus.UNAUTHORIZED
    );
  }
};

export  class NotFoundException extends HttpException {
  constructor(message?: string | object | any, error = 'Not Found') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.NOT_FOUND),
      HttpStatus.NOT_FOUND
    );
  }
};

export   class NotAcceptableException extends HttpException {
  constructor(message?: string | object | any, error = 'Not Acceptable') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.NOT_ACCEPTABLE),
      HttpStatus.NOT_ACCEPTABLE
    );
  }
};
export   class RequestTimeoutException extends HttpException {
  constructor(message?: string | object | any, error = 'Request Timeout') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.REQUEST_TIMEOUT),
      HttpStatus.REQUEST_TIMEOUT
    );
  }
};

export   class ConflictException extends HttpException {
  constructor(message?: string | object | any, error = 'Conflict') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.CONFLICT),
      HttpStatus.CONFLICT
    );
  }
};
export   class GoneException extends HttpException {
  constructor(message?: string | object | any, error = 'Gone') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.GONE),
      HttpStatus.GONE
    );
  }
};
export   class PayloadTooLargeException extends HttpException {
  constructor(message?: string | object | any, error = 'Payload Too Large') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.PAYLOAD_TOO_LARGE),
      HttpStatus.PAYLOAD_TOO_LARGE
    );
  }
};

export  class UnsupportedMediaTypeException extends HttpException {
  constructor(message?: string | object | any, error = 'Unsupported Media Type') {
    super(
      createHttpExceptionBody(
        message,
        error,
        HttpStatus.UNSUPPORTED_MEDIA_TYPE
      ),
      HttpStatus.UNSUPPORTED_MEDIA_TYPE
    );
  }
};

export   class UnprocessableEntityException extends HttpException {
  constructor(message?: string | object | any, error = 'Unprocessable Entity') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.UNPROCESSABLE_ENTITY),
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }
};
export  class InternalServerErrorException extends HttpException {
  constructor(message?: string | object | any, error = 'Internal Server Error') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.INTERNAL_SERVER_ERROR),
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

export  class NotImplementedException extends HttpException {
  constructor(message?: string | object | any, error = 'Not Implemented') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.NOT_IMPLEMENTED),
      HttpStatus.NOT_IMPLEMENTED
    );
  }
};

export  class BadGatewayException extends HttpException {
  constructor(message?: string | object | any, error = 'Bad Gateway') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.BAD_GATEWAY),
      HttpStatus.BAD_GATEWAY
    );
  }
};

export  class ServiceUnavailableException extends HttpException {
  constructor(message?: string | object | any, error = 'Service Unavailable') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.SERVICE_UNAVAILABLE),
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }
};


export  class GatewayTimeoutException extends HttpException {
  constructor(message?: string | object | any, error = 'Gateway Timeout') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.GATEWAY_TIMEOUT),
      HttpStatus.GATEWAY_TIMEOUT
    );
  }
};
