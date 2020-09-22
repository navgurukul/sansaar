const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');

const { axiosAuth, axiosUnAuth } = require('../helpers/network/axios');

module.exports = class ChatService extends Schmervice.Service {
  async handleCommand(roomId, event) {
    // Get the server from calling this function
    const server = await this.deployment();

    // Set matrix chatClient
    const client = server.app.chatClient;
    const { sender } = event;

    if (sender === (await client.getUserId())) return;

    const { body } = event.content;
    if (!body.startsWith('format')) return;

    const content = {
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
          label: 'Button 3 (Testing)',
          value: 'merakilearn.org/course/13',
        },
      ],
    };

    client.sendEvent(roomId, 'm.room.message', content, '', (err, res) => {
      if (err) {
        // eslint-disable-next-line
        console.log(err);
      }
      // eslint-disable-next-line
      console.log(res);
    });
  }

  /* eslint-disable */
  async getAllUsers(queryOptions) {
    const qParams = queryOptions;
    const allChatUsers = await axiosAuth.get('/_synapse/admin/v2/users', {
      params: qParams,
    });
    return allChatUsers.data;
  }

  async getUser(userId) {
    const chatUser = await axiosAuth.get(`/_synapse/admin/v2/users/${userId}`);
    return chatUser.data;
  }

  async createChatUser(userDetails) {
    const uDetails = userDetails;
    let data;
    await axiosAuth
      .put(`/_synapse/admin/v2/users/${uDetails.id}`, uDetails)
      .then((res) => {
        data = res.data;
      })
      .catch((err) => {
        data = err;
      });
    return data;
  }

  async userChatLogin(userId) {
    let userData;
    const { User } = this.server.models();
    const chatCredentials = await User.query().findById(userId).select('chat_id', 'chat_password');
    if (chatCredentials) {
      const loginDetails = {
        identifier: {
          type: 'm.id.user',
          user: chatCredentials.chat_id,
        },
        initial_device_display_name: 'bol.navgurukul.org (Chrome, Linux)',
        password: chatCredentials.chat_password,
        type: 'm.login.password',
      };
      await axiosUnAuth
        .post('/_matrix/client/r0/login', loginDetails)
        .then((res) => {
          userData = res.data;
        })
        .catch((err) => {
          userData = err;
        });
      return userData;
    }
    throw Boom.badRequest('ChatId and ChatPassword not yet created for this user');
  }
  /* eslint-enable */
};
