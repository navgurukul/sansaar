const {
  ValidationError,
  NotFoundError,
  DBError,
  ConstraintViolationError,
  UniqueViolationError,
  NotNullViolationError,
  ForeignKeyViolationError,
  CheckViolationError,
  DataError,
} = require('objection');

module.exports = {
  errorHandler: (err) => {
    const commonErrorResponse = (message, type, data = {}, code = 422) => ({
      error: true,
      message,
      type,
      data,
      code,
    });

    if (err instanceof ValidationError) {
      if (err.message === 'email: "email" must be a valid email') {
        return commonErrorResponse('Please provide a valid email address.', err.type, {}, 2000);
      }

      switch (err.type) {
        case 'ModelValidation':
          return commonErrorResponse(err.message, err.type, err.data);
        case 'RelationExpression':
        case 'UnallowedRelation':
          return commonErrorResponse(err.message, err.type);
        case 'InvalidGraph':
          return commonErrorResponse(err.message, err.type);
        case 'InvalidEmail':
          return commonErrorResponse('Please enter a valid email address', err.type, {}, 2000);
        default:
          return commonErrorResponse(err.message, 'UnknownValidationError');
      }
    }

    if (err instanceof NotFoundError) {
      return commonErrorResponse(err.message, 'NotFound', [], 404);
    }

    if (err instanceof UniqueViolationError) {
      return commonErrorResponse('Unique Key Violation', err.name, { detail: err.nativeError.detail });
    }

    if (err instanceof ForeignKeyViolationError) {
      return commonErrorResponse(err.message, err.name, { detail: err.nativeError.detail });
    }

    if (err instanceof ConstraintViolationError) {
      return commonErrorResponse(err.message, err.type);
    }

    if (err instanceof DBError) {
      return commonErrorResponse(err.message, 'UnknownDatabaseError');
    }

    if (err instanceof NotNullViolationError) {
      return commonErrorResponse(err.message, err.name, { column: err.column, table: err.table });
    }

    if (err instanceof DataError) {
      return commonErrorResponse(err.message, 'InvalidData');
    }

    if (err instanceof CheckViolationError) {
      return {
        message: err.message,
        type: 'CheckViolation',
        data: { table: err.table, constraint: err.constraint },
        code: 422,
      };
    }

    if (err instanceof ReferenceError || err instanceof TypeError) {
      return commonErrorResponse('Reference Error: ' + err.message, 'ReferenceError', {}, err instanceof ReferenceError ? 500 : 422);
    }

    return null;
  },

};
