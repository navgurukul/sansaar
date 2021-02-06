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
    if (err instanceof ValidationError) {
      switch (err.type) {
        case 'ModelValidation': {
          return {
            error: true,
            message: err.message,
            type: err.type,
            data: err.data,
          };
        }
        case 'RelationExpression': {
          return {
            error: true,
            message: err.message,
            type: 'RelationExpression',
            data: {},
          };
        }
        case 'InvalidGraph': {
          return {
            error: true,
            message: err.message,
            type: err.type,
            data: {},
          };
        }
        default:
          return {
            error: true,
            message: err.message,
            type: 'UnknownValidationError',
            data: {},
          };
      }
    } else if (err instanceof NotFoundError) {
      return {
        error: true,
        message: err.message,
        type: 'NotFound',
        data: {},
      };
    } else if (err instanceof UniqueViolationError) {
      return {
        error: true,
        message: `Unique Key Violation`,
        detail: err.nativeError.detail,
        type: err.name,
      };
    } else if (err instanceof ForeignKeyViolationError) {
      return {
        error: true,
        message: err.message,
        detail: err.nativeError.detail,
        type: err.name,
      };
    }
    return null;
  },
};
