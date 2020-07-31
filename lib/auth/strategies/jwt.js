const Bounce = require('@hapi/bounce');
const { NotFoundError } = require('objection');
const CONFIG = require('../../config');

module.exports = () => ({
  scheme: 'jwt',
  options: {
    key: CONFIG.auth.jwt.secret,
    urlKey: false,
    cookieKey: false,
    verifyOptions: { algorithms: ['HS256'] },
    validate: async (decoded, request) => {
      const { userService } = request.services();
      try {
        return {
          isValid: true,
          credentials: await userService.findById(decoded.id),
        };
      } catch (error) {
        Bounce.ignore(error, NotFoundError);
        return {
          isValid: false,
        };
      }
    },
  },
});
