const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const { chatKnex } = require('../../server/knex');
const { axiosAuth, axiosUnAuth } = require('../helpers/network/chat');
const botHandling = require('../helpers/bot');
const botFunctions = require('../bot/replies');

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
      .andWhere('other_user_id', '@meraki:navgurukul.org');

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

    // To reset the chat flow (For testing purpose)
    // if (body === 'reset') {
    //   botHandling.initialMessage.body = 'Hello! I am Meraki...';
    //   botHandling.initialMessage.label =
    //     'Hello! I am Meraki\n\nI will be your guide in your journey to learn programming\n\nWhat is your first language preference?';
    //   await client.sendEvent(roomId, 'm.room.message', botHandling.initialMessage, '');
    // }

    // if (msgtype !== 'org.matrix.response' && body !== 'reset') {
    // botHandling.initialMessage.body = '';
    // botHandling.initialMessage.label = '';
    // await client.sendMessage(roomId, {
    //   msgtype: 'text',
    //   body: 'Please choose from the below options',
    // });
    // await client.sendEvent(roomId, 'm.room.message', botHandling.initialMessage, '');
    // }

    if (body.toLowerCase().startsWith('hindi') || body.toLowerCase().startsWith('english')) {
      await botFunctions.selectALanguage(client, roomId);
      // await client.sendEvent(roomId, 'm.room.message', botHandling.letStartCoding, '');
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

      // const roomIdtoJoin = botHandling.getRoomId(roomAlias);

      // if (roomIdtoJoin !== undefined) {
      //   await axiosAuth.post(`/_matrix/client/r0/rooms/${roomIdtoJoin}/invite`, {
      //     user_id: sender,
      //   });
      //   await axiosAuth.post(`/_synapse/admin/v1/join/${roomIdtoJoin}`, {
      //     user_id: sender,
      //   });
      //   await client.sendMessage(roomId, {
      //     msgtype: 'text',
      //     body: `Successfully added you to room ${roomAlias}`,
      //   });
      // } else {
      //   await client.sendMessage(roomId, {
      //     msgtype: 'text',
      //     body: `${roomAlias} doesn't exist. Please enter correct room name`,
      //   });
      // }
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
