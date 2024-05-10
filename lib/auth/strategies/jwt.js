const Bounce = require('@hapi/bounce');
const { NotFoundError } = require('objection');
const _ = require('lodash');
const logger = require('../../../server/logger');
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
        if (decoded.id) {
          // eslint-disable-next-line
          let [err, user] = await userService.findById(decoded.id, 'roles');
          // if (err) {
          //   return err;
          // }
          user.scope = _.map(user.roles, (r) => r.role);
          user = _.omit(user, 'roles');

          // adding partnerGroupIds to the user object
          const [errPartnerGroup, partnerGroupId] = await userService.getPartnerGroupIds(user);
          if (errPartnerGroup) {
            logger.error(JSON.stringify(errPartnerGroup));
          }
          user.partner_group_id = partnerGroupId;

          return {
            isValid: true,
            credentials: user,
          };
        }
        return {
          isValid: true,
          credentials: decoded,
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
