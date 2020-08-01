module.exports = {
  roles: {
    all: ['student', 'team', 'trainingAndPlacement', 'admissionIncharge', 'facha', 'dumbeldore'],
    // A user with student role can not add/remove any role of any user.
    // A user with team role can add/remove student, team, t&p, admission & facha roles of any user.
    editRights: {
      student: [],
      team: ['student', 'team', 'trainingAndPlacement', 'admissionIncharge', 'facha'],
      trainingAndPlacement: [''],
      dumbeldore: ['dumbeldore']
    }
  }
};
