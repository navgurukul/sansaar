const Schmervice = require('schmervice');
const _ = require('underscore');
const { isArray } = require('underscore');

const transforms = {};

module.exports = class DisplayService extends Schmervice.Service {
  userProfile = async (user) => {
    const { User } = this.server.models();

    const results = await User.fetchGraph(user, 'roles');
    return this._applyTransform(results, transforms.userProfile);
  };

  _applyTransform = (results, func) => (isArray(results) ? _.map(results, func) : func(results));
};

transforms.userProfile = ({ roles, ...userInfo }) => ({
  rolesList: _.map(roles, (r) => r.role),
  ...userInfo,
});
