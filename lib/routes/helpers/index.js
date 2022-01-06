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
      [
        76,
        77,
        78,
        79,
        80,
        81,
        82,
        83,
        86,
        185,
        186,
        189,
        87,
        88,
        90,
        94,
        95,
        96,
        98,
        99,
        100,
        109,
        111,
        130,
        132,
        133,
        135,
        138,
      ],
      [
        19,
        19,
        19,
        19,
        19,
        19,
        19,
        19,
        19,
        33,
        33,
        33,
        20,
        20,
        20,
        20,
        20,
        20,
        20,
        20,
        20,
        20,
        20,
        20,
        24,
        24,
        24,
        24,
      ],
    ];
  } else {
    courseExerciseIds = [
      [
        182,
        183,
        184,
        173,
        174,
        175,
        176,
        177,
        178,
        179,
        180,
        181,
        76,
        77,
        78,
        79,
        80,
        81,
        82,
        83,
        86,
        185,
        186,
        189,
        132,
        133,
        135,
        138,
      ],
      [
        31,
        31,
        31,
        27,
        28,
        30,
        30,
        30,
        30,
        30,
        30,
        30,
        19,
        19,
        19,
        19,
        19,
        19,
        19,
        19,
        19,
        33,
        33,
        33,
        24,
        24,
        24,
        24,
      ],
    ];
  }
  return courseExerciseIds;
};

module.exports = { getEditableRoles, getRouteScope, getCourseAndExerciseIds };
