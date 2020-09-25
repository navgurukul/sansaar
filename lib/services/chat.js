const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const { bolKnex } = require('../../server/knex');
const { axiosAuth, axiosUnAuth } = require('../helpers/network/chat');
const botHandling = require('../helpers/chats');
const CONFIG = require('../config/index');

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

    const content = botHandling.buttonFormat;

    // const TEST = await bolKnex('public.room_memberships')
    //   .where('sender', 'like', '@meraki%')
    //   .andWhere('user_id', 'like', '@sha%');

    await client.sendEvent(roomId, 'm.room.message', content, '');
  }

  async createChatRoom(chatUserId) {
    const { server } = this;
    const client = server.app.chatClient;
    this.createRoom = {
      preset: 'trusted_private_chat',
      visibility: 'private',
      invite: [`${chatUserId}`],
      is_direct: true,
      initial_state: [
        {
          type: 'm.room.guest_access',
          state_key: '',
          content: {
            guest_access: 'can_join',
          },
        },
      ],
    };

    const roomId = await axiosUnAuth.post('/_matrix/client/r0/createRoom', this.createRoom, {
      headers: {
        Authorization: `Bearer ${CONFIG.auth.chat.accessToken}`,
      },
    });

    await axiosAuth.post(`/_synapse/admin/v1/join/${roomId.data.room_id}`, {
      user_id: chatUserId,
    });

    const content = botHandling.initialMessage;
    const img = botHandling.initialImage;

    /* eslint-disable */
    await client.sendEvent(roomId.data.room_id, 'm.room.message', content, '');
    await client.sendEvent(roomId.data.room_id, 'm.room.message', img, '');
    /* eslint-enable */

    return roomId.data;
  }

  async getAllUsers(queryOptions) {
    this.qParams = queryOptions;
    const allChatUsers = await axiosAuth.get('/_synapse/admin/v2/users', {
      params: this.qParams,
    });
    return allChatUsers.data;
  }

  async getUser(userId) {
    this.chatUser = await axiosAuth.get(`/_synapse/admin/v2/users/${userId}`);
    return this.chatUser.data;
  }

  async createChatUser(userDetails) {
    this.uDetails = userDetails;
    this.data = null;
    this.uDetails.id = `@${userDetails.id}:navgurukul.org`;
    await axiosAuth
      .put(`/_synapse/admin/v2/users/${this.uDetails.id}`, this.uDetails)
      .then((res) => {
        this.data = res.data;
      })
      .catch((err) => {
        this.data = err;
      });
    return this.data;
  }

  async userChatLogin(userId) {
    this.userData = null;
    const { User } = this.server.models();
    this.chatCredentials = await User.query().findById(userId).select('chat_id', 'chat_password');
    if (this.chatCredentials) {
      this.loginDetails = {
        identifier: {
          type: 'm.id.user',
          user: this.chatCredentials.chat_id,
        },
        initial_device_display_name: 'bol.navgurukul.org (Chrome, Linux)',
        password: this.chatCredentials.chat_password,
        type: 'm.login.password',
      };
      await axiosUnAuth
        .post('/_matrix/client/r0/login', this.loginDetails)
        .then((res) => {
          this.userData = res.data;
        })
        .catch((err) => {
          this.userData = err;
        });
      return this.userData;
    }
    throw Boom.badRequest('ChatId and ChatPassword not yet created for this user');
  }
};
