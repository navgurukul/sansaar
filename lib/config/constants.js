module.exports = {
  meraki_link_url:
  'https://play.google.com/store/apps/details?id=org.merakilearn&referrer=utm_source%3Dwhatsapp%26utm_medium%3Dpartner_name%26utm_content%3Dpartner_id%253A',
  c4ca_meraki_url:
  'https://play.google.com/store/apps/details?id=org.merakilearn&referrer=utm_source%3Dwhatsapp%26utm_medium%3Dpartner_name%26utm_content%3Dc4ca_partner_id%253Apartner_id_val%26utm_content%3Dc4ca_facilitator_id%253Afacilitator_id_va%253A',
  c4ca_meraki_url_dev: '',
  web_link_url:
  'https://www.merakilearn.org/login?referrer=utm_source%3Dwhatsapp%26utm_medium%3Dpartner_name%26utm_content%3Dpartner_id%253A',
  web_link_url_dev:
  'https://www.merd-bhanwaridevi.merakilearn.org/login?referrer=utm_source%3Dwhatsapp%26utm_medium%3Dpartner_name%26utm_content%3Dpartner_id%253A',
  c4ca_teacher_link: 'https://c4ca.in/?referrer=utm_source%3Dwhatsapp%26utm_medium%3Dpartner_name%26utm_content%3Dc4ca_partner_id%253Apartner_id_val%26utm_content%3Dc4ca_facilitator_id%253Afacilitator_id_val%253A',
  c4ca_teacher_link_dev: '',
  roles: {
    all: [
      'student',
      'team',
      'trainingAndPlacement',
      'classAdmin',
      'admissionIncharge',
      'facha',
      'volunteer',
      'teacher',
      'partner',
      'admin',
      'publisher',
      'editor',
      'c4caTeacher', // role for c4ca teachers
      'facilitator' // role for c4ca partners
    ],
    // A user with student role can not add/remove any role of any user.
    // A user with team role can add/remove student, team, t&p, admission & facha roles of any user.
    editRights: {
      student: [],
      team: ['student', 'team', 'trainingAndPlacement', 'admissionIncharge', 'facha'],
      trainingAndPlacement: ['student'],
      classAdmin: ['student'],
      admissionIncharge: [],
      facha: ['student', 'trainingAndPlacement', 'admissionIncharge'],
      volunteer: [],
      teacher: [],
      partner: [],
      publisher: [],
      editor: [],
      admin: [
        'student',
        'team',
        'traningAndPlacement',
        'admissionIncharge',
        'facha',
        'volunteer',
        'teacher',
        'partner',
        'editor',
        'publisher',
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
