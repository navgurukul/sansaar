module.exports = {
  initialMessage: {
    msgtype: 'org.matrix.options',
    type: 'org.matrix.buttons',
    body: 'Hey',
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
  initialImage: {
    msgtype: 'm.image',
    body: 'cubs.jpg',
    info: { mimetype: 'image/jpeg', w: 720, h: 720, size: 9000 },
    url: 'https://i.pinimg.com/originals/df/ef/52/dfef52bc718c0e35ded5ad5eb80da4bb.jpg',
  },
  buttonFormat: {
    msgtype: 'org.matrix.options',
    type: 'org.matrix.buttons',
    body: 'I am a deeplink button',
    label: 'I am a deeplink button',
    options: [
      {
        label: 'Button 1 (Testing)',
        value: 'Value 1',
      },
      {
        label: 'Button 2 (Testing)',
        value: 'merakilearn.org/course/13',
      },
    ],
  },
};
