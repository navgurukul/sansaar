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

    const errorMappings = [
      {
        condition: err instanceof ValidationError,
        handler: () => {
          if (err.message === 'email: "email" must be a valid email') {
            return commonErrorResponse('Please provide a valid email address.', err.type, {}, 2000);
          }
          switch (err.type) {
            case 'ModelValidation':
            case 'RelationExpression':
            case 'UnallowedRelation':
            case 'InvalidGraph':
              return commonErrorResponse(err.message, err.type);
            case 'InvalidEmail':
              return commonErrorResponse('Please enter a valid email address', err.type, {}, 2000);
            default:
              return commonErrorResponse(err.message, 'UnknownValidationError');
          }
        },
      },
      { condition: err instanceof NotFoundError, handler: () => commonErrorResponse(err.message, 'NotFound', [], 404) },
      { condition: err instanceof UniqueViolationError, handler: () => commonErrorResponse('Unique Key Violation', err.name, { detail: err.nativeError.detail }) },
      { condition: err instanceof ForeignKeyViolationError, handler: () => commonErrorResponse(err.message, err.name, { detail: err.nativeError.detail }) },
      { condition: err instanceof ConstraintViolationError, handler: () => commonErrorResponse(err.message, err.type) },
      { condition: err instanceof DBError, handler: () => commonErrorResponse(err.message, 'UnknownDatabaseError') },
      { condition: err instanceof NotNullViolationError, handler: () => commonErrorResponse(err.message, err.name, { column: err.column, table: err.table }) },
      { condition: err instanceof DataError, handler: () => commonErrorResponse(err.message, 'InvalidData') },
      {
        condition: err instanceof CheckViolationError,
        handler: () => ({
          message: err.message,
          type: 'CheckViolation',
          data: { table: err.table, constraint: err.constraint },
          code: 422,
        }),
      },
      {
        condition: err instanceof ReferenceError || err instanceof TypeError,
        handler: () =>
          commonErrorResponse(
            'Reference Error: ' + err.message,
            'ReferenceError',
            {},
            err instanceof ReferenceError ? 500 : 422
          ),
      },
    ];

    for (const mapping of errorMappings) {
      if (mapping.condition) {
        return mapping.handler();
      }
    }

    return null;
  },

};
