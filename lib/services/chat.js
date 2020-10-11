const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const { chatKnex } = require('../../server/knex');
const { axiosAuth, axiosUnAuth } = require('../helpers/network/chat');
const botHandling = require('../bot');
const botFunctions = require('../bot/actions');
const CONFIG = require('../config/index');

// eslint-disable-next-line
const MONTHS = {
  0: 'January',
  1: 'February',
  2: 'March',
  3: 'April',
  4: 'May',
  5: 'June',
  6: 'July',
  7: 'August',
  8: 'September',
  9: 'October',
  10: 'November',
  11: 'December',
};

module.exports = class ChatService extends Schmervice.Service {
  async handleCommand(roomId, event) {
    // Get the server from calling this function
    const server = await this.deployment();

    // const retrieveLastByMeraki = await chatKnex
    //   .select('*')
    //   .from('public.events')
    //   .where('sender', '@meraki:navgurukul.org')
    //   .andWhere('room_id', roomId)
    //   .orderBy('topological_ordering', 'desc')
    //   .first();

    const privateRoomId = await chatKnex('public.users_who_share_private_rooms')
      .where('user_id', event.sender)
      .andWhere('other_user_id', CONFIG.auth.chat.merakiUserId);

    // Set matrix chatClient
    const client = server.app.chatClient;
    const { sender } = event;

    if (privateRoomId.length <= 0) return; // If message is sent to any other room (This also effectively checks if bot is the event sender)
    if (sender === (await client.getUserId())) return; // Return if bot is the event sender
    if (roomId !== privateRoomId[0].room_id) return; // Probably redudandent, since this check is already done in the first if statement

    // eslint-disable-next-line
    const { body, msgtype } = event.content;

    // console.log('********************************************************');
    // console.log(event.content['m.relates_to'].event_id);
    // console.log(retrieveLastByMeraki.event_id);
    // console.log('********************************************************');

    // if (event.content['m.relates_to'].event_id === retrieveLastByMeraki.event_id) {}

    if (body === 'http://merakilearn.org/home') return;

    if (body.toLowerCase().startsWith('hindi') || body.toLowerCase().startsWith('english')) {
      await botFunctions.selectALanguage(client, roomId);
    } else if (!body.toLowerCase().startsWith('join')) {
      botHandling.initialMessage.body = '';
      botHandling.initialMessage.label = '';
      await client.sendMessage(roomId, {
        msgtype: 'text',
        body: 'Please choose from the given options',
      });
    }

    if (body.toLowerCase().startsWith('join')) {
      const roomToJoin = body.toLowerCase().split('-').pop();
      await botFunctions.joinARoom(client, sender, roomId, roomToJoin);
    }
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

    const roomId = await axiosAuth.post('/_matrix/client/r0/createRoom', this.createRoom);

    await axiosAuth.post(`/_synapse/admin/v1/join/${roomId.data.room_id}`, {
      user_id: chatUserId,
    });

    await client.sendEvent(roomId.data.room_id, 'm.room.message', botHandling.initialMessage, '');

    return roomId.data;
  }

  async sendInitialMessage(client, roomId) {
    this.roomId = roomId;
    await client.sendEvent(this.roomId, 'm.room.message', botHandling.initialMessage, '');
  }

  async sendClassJoinConfirmation(meetLink, startTime, userId) {
    const { server } = this;
    const { User } = this.server.models();
    const client = server.app.chatClient;

    const user = await User.query().where('id', userId);
    let chatId = user[0].chat_id;
    chatId = `@${chatId}:navgurukul.org`;

    const classTime = startTime.toISOString().split('T')[1].split('').slice(0, -8).join('');
    const classDate = startTime.toISOString().split('T')[0];

    const privateRoomId = await chatKnex('public.users_who_share_private_rooms')
      .where('user_id', chatId)
      .andWhere('other_user_id', CONFIG.auth.chat.merakiUserId);

    if (privateRoomId.length <= 0) return;

    const message = botHandling.classJoined;
    message.label = botHandling.classJoined.label.replace('^TIME^', classTime);
    message.label = botHandling.classJoined.label.replace('^DATE^', classDate);
    message.options[0].value = botHandling.classJoined.options[0].value.replace(
      '^MEET_LINK^',
      meetLink
    );
    await client.sendEvent(privateRoomId[0].room_id, 'm.room.message', message, '');
  }

  async classDropoutMessage(userId) {
    const { server } = this;
    const { User } = this.server.models();

    const client = server.app.chatClient;
    const user = await User.query().where('id', userId);
    let chatId = user[0].chat_id;
    chatId = `@${chatId}:navgurukul.org`;

    const privateRoomId = await chatKnex('public.users_who_share_private_rooms')
      .where('user_id', chatId)
      .andWhere('other_user_id', CONFIG.auth.chat.merakiUserId);

    if (privateRoomId.length <= 0) return;
    await client.sendMessage(privateRoomId[0].room_id, botHandling.classDropout);
  }

  // Unused
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
