'use strict';

import { BadRequestException }  from '../exceptions/exception';

export class ParseIntPipe {
  async transform(value: string) {
    const isNumeric =
      typeof value === 'string' &&
      !isNaN(parseFloat(value)) &&
      isFinite(value as any);
    if (!isNumeric) {
      throw new BadRequestException(
        'Validation failed (numeric string is expected)'
      );
    }
    return parseInt(value, 10);
  }
};

