const _ = require('lodash');
const CONFIG = require('../../config');

// returns the roles which can be edited by the given list of roles
const getEditableRoles = (roleList) => {
  const editableRoles = _.uniq(_.flatten(_.map(roleList, (r) => CONFIG.roles.editRights[r])));
  return _.filter(editableRoles);
};

const getRouteScope = (roles) => {
  let roleList = roles;
  if (Array.isArray(roleList)) {
    // roleList.push('dumbeldore');
    roleList.push('admin');
  } else {
    roleList = [roleList, 'admin'];
  }
  return _.uniq(roleList);
};

module.exports = { getEditableRoles, getRouteScope };
