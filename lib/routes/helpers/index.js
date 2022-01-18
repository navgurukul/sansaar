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

const getCourseAndExerciseIds = (pathway_id) => {
  let courseExerciseIds;
  if (pathway_id === 1) {
    courseExerciseIds = [
      [390, 391, 392, 393, 394],
      [49, 49, 49, 49, 49],
    ];
  } else {
    courseExerciseIds = [
      [398, 399, 400, 401, 402],
      [50, 50, 50, 50, 50],
    ];
  }
  return courseExerciseIds;
};

module.exports = { getEditableRoles, getRouteScope, getCourseAndExerciseIds };
