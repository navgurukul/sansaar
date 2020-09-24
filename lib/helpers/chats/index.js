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
    url:
      'https://www.peta.org/wp-content/uploads/2015/08/iStock_000007036450_Small-602x403-1440082093.jpg',
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
