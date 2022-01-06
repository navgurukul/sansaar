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
      [398, 423, 424, 459, 458],
      [50, 51, 51, 53, 53],
    ];
  } else {
    courseExerciseIds = [
      [398, 423, 424, 459, 458],
      [50, 51, 51, 53, 53],
    ];
  }
  return courseExerciseIds;
};

module.exports = { getEditableRoles, getRouteScope, getCourseAndExerciseIds };
