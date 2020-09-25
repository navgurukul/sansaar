module.exports = {
  initialMessage: {
    msgtype: 'org.matrix.options',
    type: 'org.matrix.buttons',
    body: 'Hello! Mera naam Meraki hai, main aapko Meraki app use karna sikhaungi :)',
    label: 'Hello! Mera naam Meraki hai, main aapko Meraki app use karna sikhaungi :)',
    options: [
      {
        label: 'I Understand!',
        value: 'Yes',
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
    body: 'I am a deeplink',
    label: 'I am a deeplink',
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
