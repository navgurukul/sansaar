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
        case 'UnallowedRelation': {
          return {
            error: true,
            message: err.message,
            type: 'UnallowedRelation',
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
        default: {
          return {
            error: true,
            message: err.message,
            type: 'UnknownValidationError',
            data: {},
          };
        }
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
    } else if (err instanceof ConstraintViolationError) {
      return {
        error: true,
        message: err.message,
        type: err.type,
      };
    } else if (err instanceof DBError) {
      return {
        error: true,
        message: err.message,
        type: 'UnknownDatabaseError',
        data: {},
      };
    } else if (err instanceof NotNullViolationError) {
      return {
        error: true,
        message: err.message,
        type: err.name,
        data: {
          column: err.column,
          table: err.table,
        },
      };
    } else if (err instanceof DataError) {
      return {
        error: true,
        message: err.message,
        type: 'InvalidData',
        data: {},
      };
    } else if (err instanceof CheckViolationError) {
      return {
        message: err.message,
        type: 'CheckViolation',
        data: {
          table: err.table,
          constraint: err.constraint,
        },
      };
    }
    return null;
  },
};
