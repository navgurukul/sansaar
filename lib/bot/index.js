module.exports = {
  // function returning roomId with given room alias
  getRoomId: (roomName) => {
    const roomAlias = {
      mch6: '!wSYiSXCylCCuKzIrrT:navgurukul.org',
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

  classJoined: {
    msgtype: 'org.matrix.options',
    type: 'org.matrix.buttons',
    body: `Thanks for registering the class.`,
    label: `We look forward to having you at ^TIME^, on ^DATE^. Please be on time.\n\nYou can click on the button below to join the class.`,
    options: [
      {
        label: 'Join the class',
        value: `https://meet.google.com/^MEET_LINK^`,
      },
    ],
  },

  classDropout: {
    msgtype: 'text',
    body: 'Sorry to see you dropout :(\n\nHoping you will enroll to upcoming classes.',
  },

  initialImage: {
    msgtype: 'm.image',
    body: 'cubs.jpg',
    info: { mimetype: 'image/jpeg', w: 720, h: 720, size: 9000 },
    url: 'https://i.pinimg.com/originals/df/ef/52/dfef52bc718c0e35ded5ad5eb80da4bb.jpg',
  },
};
