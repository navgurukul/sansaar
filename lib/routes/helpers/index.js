const _ = require('underscore');
const CONFIG = require('../../config');

// returns the roles which can be edited by the given list of roles
const getEditableRoles = (roleList) => {
  const editableRoles = _.uniq(_.flatten(_.map(roleList, (r) => CONFIG.roles.editRights[r])));
  return _.filter(editableRoles);
};

module.exports = { getEditableRoles };
