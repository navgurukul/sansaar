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

const getCareerRouteScope = (roles) => {
  let roleList = roles;
  if (Array.isArray(roleList)) {
    roleList.push('careerAdmin');
  } else {
    roleList = [roleList, 'careerAdmin'];
  }
  return _.uniq(roleList);
};

const getSuperAdminScope = (roles) => {
  let roleList = roles;
  if (Array.isArray(roleList)) {
    roleList.push('superAdmin');
  } else {
    roleList = [roleList, 'superAdmin'];
  }
  return _.uniq(roleList);
};

const getCareerTeacherScope = (roles) => {
  let roleList = roles;
  if (Array.isArray(roleList)) {
    roleList.push('careerTeacher');
  } else {
    roleList = [roleList, 'careerTeacher'];
  }
  return _.uniq(roleList);
};

const getCareerEditableRoles = (roleList) => {
  const editableRoles = _.uniq(_.flatten(_.map(roleList, (r) => CONFIG.roles.careerEditable)));
  return _.filter(editableRoles);
};

module.exports = { 
  getEditableRoles, 
  getRouteScope, 
  getCareerRouteScope, 
  getCareerEditableRoles, 
  getCareerTeacherScope ,
  getSuperAdminScope
};
