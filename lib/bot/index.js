module.exports = {
  // function returning roomId with given room alias
  getRoomId: (roomName) => {
    const roomAlias = {
      mch7: '!UhGmwECZFtmchwOBzO:navgurukul.org',
      mch6: '!wSYiSXCylCCuKzIrrT:navgurukul.org',
      mch3: '!BMyFTVKLZWyWgYNxFN:navgurukul.org',
      mch4: '!QMcwqEVTyWeSfXpMQF:navgurukul.org',
      mch5: '!SekXPnBUucUGYPOlgi:navgurukul.org',
      mce3: '!foTMlckYryerSqhNOM:navgurukul.org',
      mce4: '!YwAuzdPvuztORQLfGU:navgurukul.org',
      mce5: '!HWqnrZlNLJNKPXQTAH:navgurukul.org',
    };
    return roomAlias[roomName];
  },
  initialMessage: {
    msgtype: 'org.matrix.options',
    type: 'org.matrix.buttons',
    body: 'Hello! I am Meraki...',
    label:
      'Hello! I am Meraki\n\nI will be your guide in your journey to learn programming\n\nWhat is your first language preference?',
    options: [
      {
        label: 'English',
        value: 'english',
      },
      {
        label: 'Hindi / हिंदी',
        value: 'hindi',
      },  
    ],
  },

  letStartCoding: {
    en: {
      msgtype: 'org.matrix.options',
      type: 'org.matrix.buttons',
      body: 'Congratulations!',
      label: 'Congratulations!\n\nYou crossed your first step towards learning.',
      options: [
        {
          label: "Let's start coding!!",
          value: 'http://merakilearn.org/home',
        },
      ],
    },
    hi: {
      msgtype: 'org.matrix.options',
      type: 'org.matrix.buttons',
      body: 'Badhaee ho!',
      label: 'Badhaee ho!\n\n Aap ne seekhane kee disha mein apana pahala kadam paar kar liya.',
      options: [
        {
          label: 'Coding shuroo karate hain!!',
          value: 'http://merakilearn.org/home',
        },
      ],
    },
  },

  classReminder: {
    msgtype: 'org.matrix.options',
    type: 'org.matrix.buttons',
    body: 'You have a ^TYPE^ class coming.',
    label:
      'You have a class on --CLASS-- coming up in 15 minutes. Join it by clicking on the button below.',
    options: [
      {
        label: 'Join class',
        value: 'https://meet.google.com/^MEET_LINK^',
      },
    ],
  },

  classFeedbackFirst: {
    msgtype: 'org.matrix.options',
    type: 'org.matrix.buttons',
    body: 'Feedback on ---TITLE--- class',
    label: 'Hi! Did you attend the ---TYPE--- class on ---TITLE---.---by FACILITATOR---?',
    options: [
      {
        label: 'Yes',
        value: `class_attended_true`,
      },
      {
        label: 'No',
        value: `class_attended_false`,
      },
    ],
  },

  classFeedbackRating: {
    msgtype: 'org.matrix.options',
    type: 'org.matrix.buttons',
    body: 'Did you like the class?',
    label: 'How would you rate the class?',
    options: [
      {
        label: '5',
        value: '5',
      },
      {
        label: '4',
        value: '4',
      },
      {
        label: '3',
        value: '3',
      },
      {
        label: '2',
        value: '2',
      },
      {
        label: '1',
        value: '1',
      },
    ],
  },

  thanksForFeedback: {
    msgtype: 'text',
    body: "Thank you for your feedback. :) It's important and help us to improve.",
  },

  classJoined: {
    en: {
      msgtype: 'org.matrix.options',
      type: 'org.matrix.buttons',
      body: 'Thanks for registering the class.',
      label:
        'Thanks for registering the class on ---TITLE---.---by FACILITATOR---. The class will be conducted in ---LANG---.\n\nWe look forward to having you at ---TIME---, on ---DATE---. Please be on time.\n\nYou can click on the button below to join the class.',
      options: [
        {
          label: 'Join the class',
          value: 'https://meet.google.com/^MEET_LINK^',
        },
      ],
    },
    hi: {
      msgtype: 'org.matrix.options',
      type: 'org.matrix.buttons',
      body: 'Class me enroll karne ke liye Shukriya.',
      label:
        '---TITLE--- class me enroll karne ke liye Shukriya. class ---LANG--- me hoga.\n\n---DATE---, ---TIME--- class ko time par join karna na bhoolein.\n\nClass join karne ke liye neeche diye gaye link par click karein',
      options: [
        {
          label: 'Class join kare',
          value: 'https://meet.google.com/^MEET_LINK^',
        },
      ],
    },
  },

  classDropout: {
    en: {
      msgtype: 'text',
      body: 'Sorry to see you dropout :(\n\nHoping you will enroll to upcoming classes.',
    },
    hi: {
      msgtype: 'text',
      body: 'Aapke jaane se hume khed hai :(\ hume bharosa hai ki aap aane wale class me enroll karoge.',
    },
  },

  initialImage: {
    msgtype: 'm.image',
    body: 'cubs.jpg',
    info: { mimetype: 'image/jpeg', w: 720, h: 720, size: 9000 },
    url: 'https://i.pinimg.com/originals/df/ef/52/dfef52bc718c0e35ded5ad5eb80da4bb.jpg',
  },
};
