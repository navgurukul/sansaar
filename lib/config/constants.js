module.exports = {
  roles: {
    all: ['student', 'team', 'trainingAndPlacement', 'admissionIncharge', 'facha', 'dumbeldore'],
    // A user with student role can not add/remove any role of any user.
    // A user with team role can add/remove student, team, t&p, admission & facha roles of any user.
    editRights: {
      student: [],
      team: ['student', 'team', 'trainingAndPlacement', 'admissionIncharge', 'facha'],
      trainingAndPlacement: ['student'],
      admissionIncharge: [],
      facha: ['student', 'trainingAndPlacement', 'admissionIncharge'],
      dumbeldore: [
        'student',
        'team',
        'traningAndPlacement',
        'admissionIncharge',
        'facha',
        'dumbeldore',
      ],
    },
  },
  progressTracking: {
    parameters: {
      type: {
        boolean: { name: 'Boolean', key: 'boolean' },
        range: { name: 'Integer Range', key: 'range' },
      },
    },
    questions: {
      type: {
        text: 'Long Answer',
      },
    },
    requestType: {
      completed: 'Completed',
      pending: 'Pending',
    },
    trackingFrequency: {
      weekly: 'Weekly',
      fortnightly: 'Fortnightly (Every 2 weeks)',
      monthly: 'Monthly',
    },
    trackingDayOfWeek: {
      0: 'Sunday',
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday',
    },
  },
};
