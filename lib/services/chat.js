const Schmervice = require('schmervice');
const _ = require('lodash');
const { axiosAuth, axiosUnAuth } = require('../helpers/network/chat');
const { chatKnex } = require('../../server/knex');
const botHandling = require('../bot');
const botFunctions = require('../bot/actions');
const CONFIG = require('../config/index');
const { timeFormatter } = require('../helpers/index');

module.exports = class ChatService extends Schmervice.Service {
  async handleCommand(roomId, event) {
    // Get the server from calling this function
    const server = await this.deployment();

    const { User, ClassRegistrations } = server.models();

    // const retrieveLastByMeraki = await chatKnex
    //   .select('*')
    //   .from('public.events')
    //   .where('sender', '@meraki:navgurukul.org')
    //   .andWhere('room_id', roomId)
    //   .orderBy('topological_ordering', 'desc')
    //   .first();

    const privateRoomId = await botFunctions.getPrivateRoomId(event.sender);
    // Set matrix chatClient
    const client = server.app.chatClient;
    const { sender } = event;

    if (privateRoomId === null || privateRoomId === 'user_not_found') return; // If message is sent to any other room (This also effectively checks if bot is the event sender)
    if (sender === (await client.getUserId())) return; // Return if bot is the event sender
    if (roomId !== privateRoomId) return; // Probably redudandent, since this check is already done in the first if statement

    // eslint-disable-next-line
    const { body } = event.content;

    // console.log('********************************************************');
    // console.log(event.content['m.relates_to'].event_id);
    // console.log(retrieveLastByMeraki.event_id);
    // console.log('********************************************************');

    // if (event.content['m.relates_to'].event_id === retrieveLastByMeraki.event_id) {}

    if (body === 'http://merakilearn.org/home') return;

    if (body.toLowerCase().startsWith('hindi') || body.toLowerCase().startsWith('english')) {
      const langMapping = {
        hi: 'Hindi',
        en: 'English',
      };
      const langCode = body.toLowerCase().substr(0, 2);
      const senderChatId = sender.split(':')[0].slice(1);
      await User.query().patch({ lang_1: langCode }).where('chat_id', senderChatId);
      const userEmail = await User.query().select('email').where('chat_id', senderChatId);
      // Check if user has logged in with email
      if (userEmail.length > 0 && !userEmail[0].email.includes('@fake')) {
        // Find existing class rooms
        const prefix = CONFIG.auth.chat.merakiUserId.split(':')[0].substr(1);
        const existingRooms = await botFunctions.getPublicRoomId(`${prefix}${langCode}`);
        // If class rooms exists (Refer to line 81 if not)
        if (existingRooms.length > 0) {
          // Get the last created room
          const latestRoom = existingRooms[existingRooms.length - 1];
          // Get list of all users in the room
          const userList = await botFunctions.getPublicRoomUserLists(latestRoom.room_id);
          if (userList.length <= 151) {
            // Add the new user if there is space
            await botFunctions.joinARoom(
              client,
              sender,
              latestRoom.room_id,
              latestRoom.room_alias,
              privateRoomId
            );
          } else {
            // If there is no space, create a new class room with an incremented number
            const newRoomAlias = latestRoom.room_alias.split(':')[0].split('#')[1];
            const newNumber = +newRoomAlias.split('class')[1] + 1;
            const roomAliasName = `${CONFIG.auth.chat.merakiUserId
              .split(':')[0]
              .substr(1)}${langCode}class${newNumber}`;
            const name = `${langMapping[langCode]}-${newNumber}`;
            const topic = `${langMapping[langCode]} Classes - ${newNumber}`;
            const visibility = 'public';
            const payload = { roomAliasName, name, topic, visibility };
            const newCreatedRoom = await botFunctions.createARoom(payload);

            // Sindhu to be added in each group
            const teamMembers = {
              // yash: {
              //   chatId: '@yasho7jp79vu:navgurukul.org',
              //   privateChatWithMeraki: '!JPBemfIFHDgArEyVKh:navgurukul.org',
              // },
              sindhu: {
                chatId: '@sindhu0v2judhr:navgurukul.org',
                privateChatWithMeraki: '!AYnAOsCEERqahVQZzR:navgurukul.org',
              },
            };

            Object.keys(teamMembers).forEach(async (teamMember) => {
              await botFunctions.joinARoom(
                client,
                teamMembers[teamMember].chatId,
                newCreatedRoom.room_id,
                newCreatedRoom.room_alias,
                teamMembers[teamMember].privateChatWithMeraki
              );
            });
            // Specific requirement

            await botFunctions.joinARoom(
              client,
              sender,
              newCreatedRoom.room_id,
              newCreatedRoom.room_alias,
              privateRoomId
            );
          }
        } else {
          // If class room doesn't exists
          const newNumber = `1`;
          const roomAliasName = `${CONFIG.auth.chat.merakiUserId
            .split(':')[0]
            .substr(1)}${langCode}class${newNumber}`;
          const name = `${langMapping[langCode]}-${newNumber}`;
          const topic = `${langMapping[langCode]} Classes - ${newNumber}`;
          const visibility = 'public';
          const payload = { roomAliasName, name, topic, visibility };
          const newCreatedRoom = await botFunctions.createARoom(payload);
          if (newCreatedRoom) {
            await botFunctions.joinARoom(
              client,
              sender,
              newCreatedRoom.room_id,
              newCreatedRoom.room_alias,
              privateRoomId
            );
          }
        }
      }
      const lang = await User.query().select('lang_1').where('chat_id', senderChatId);
      if (lang.length > 0) await botFunctions.languageSelected(client, roomId, lang[0].lang_1);
    }

    if (body.toLowerCase().startsWith('join')) {
      const roomAlias = body.toLowerCase();
      let splitted = roomAlias.split('-');
      if (splitted.length <= 1) {
        splitted = roomAlias.split(' ');
      }
      const roomToJoin = splitted.pop();
      let roomIdToJoin = botHandling.getRoomId(roomToJoin);

      if (roomToJoin.includes('hiclass') || roomToJoin.includes('enclass')) {
        const fetchedRoom = await botFunctions.getPublicRoomId(roomToJoin);
        roomIdToJoin = fetchedRoom[0].room_id;
      }
      await botFunctions.joinARoom(client, sender, roomIdToJoin, roomToJoin, privateRoomId);
    }

    if (body.toLowerCase().startsWith('class_attended_true')) {
      const classId = body.split('_').pop();
      const userId = await User.query()
        .select('id')
        .where('chat_id', sender.split(':')[0].substr(1));
      await ClassRegistrations.query().where('class_id', classId).andWhere('user_id', userId[0].id);
      const feedbackMessage = _.cloneDeep(botHandling.classFeedbackRating);
      feedbackMessage.options.forEach((rate) => {
        rate.value = rate.value.concat(`_${classId}`).concat(`_${userId[0].id}`);
      });

      await client.sendEvent(roomId, 'm.room.message', feedbackMessage, '');
    }

    if (
      body.toLowerCase().startsWith('5_') ||
      body.toLowerCase().startsWith('4_') ||
      body.toLowerCase().startsWith('3_') ||
      body.toLowerCase().startsWith('2_') ||
      body.toLowerCase().startsWith('1_')
    ) {
      const rating = body.split('_')[0];
      const classId = body.split('_')[1];
      const userId = body.split('_')[2];
      await ClassRegistrations.query()
        .patch({ feedback: rating, feedback_at: new Date() })
        .where('class_id', classId)
        .andWhere('user_id', userId);
      await client.sendMessage(roomId, botHandling.thanksForFeedback);
    }
  }

  async createChatRoom(chatUserId) {
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
    return roomId.data;
  }

  async sendInitialMessage(roomId) {
    const { server } = this;
    const client = server.app.chatClient;
    this.roomId = roomId;
    await client.sendEvent(this.roomId, 'm.room.message', botHandling.initialMessage, '');
  }

  async sendInitialMessageWithoutLanguage(roomId) {
    const { server } = this;
    const client = server.app.chatClient;
    this.roomId = roomId;
    await client.sendEvent(
      this.roomId,
      'm.room.message',
      botHandling.initialMessageWithoutLanguage,
      ''
    );
  }

  async sendClassJoinConfirmation(classDetails, userId) {
    const langCode = {
      hi: 'Hindi',
      en: 'English',
      te: 'Telugu',
      ta: 'Tamil',
    };
    const { server } = this;
    const { User, RecurringClasses } = this.server.models();
    const client = server.app.chatClient;

    const { meet_link, start_time, facilitator_name, title, lang } = classDetails;

    const user = await User.query().where('id', userId);
    let chatId = user[0].chat_id;
    chatId = `@${chatId}:navgurukul.org`;

    let classTime = start_time.split('T')[1].split('').slice(0, -8).join('');
    classTime = timeFormatter(classTime);
    const classDate = start_time.split('T')[0];
    const classesOfUser = await RecurringClasses.query().select('cohort_room_id');
    const roomsOfClasses = [];
    _.map(classesOfUser, (n) => {
      if (n.cohort_room_id != null) {
        roomsOfClasses.push(n.cohort_room_id);
      }
    });
    const privateRoomId = await botFunctions.getPrivateRoomId(chatId, roomsOfClasses);
    if (privateRoomId === null || privateRoomId === 'user_not_found') return;

    /* eslint-enable */
    let message;
    if (user[0].lang_1 == null) {
      message = _.cloneDeep(botHandling.classJoined.en);
    } else {
      message = _.cloneDeep(botHandling.classJoined[user[0].lang_1]);
    }

    if (facilitator_name) {
      message.label = message.label.replace(/.---by FACILITATOR---/g, ` by ${facilitator_name}`);
    } else {
      message.label = message.label.replace(/.---by FACILITATOR---/g, '');
    }
    message.label = message.label.replace(/---TITLE---/g, title);
    message.label = message.label.replace(/---LANG---/g, langCode[lang]);
    message.label = message.label.replace(/---TIME---/g, classTime);
    message.label = message.label.replace(/---DATE---/g, classDate);
    message.options[0].value = message.options[0].value.replace('^MEET_LINK^', meet_link);

    await client.sendEvent(privateRoomId, 'm.room.message', message, '');
  }

  async classDropoutMessage(userId) {
    const { server } = this;
    const { User, RecurringClasses } = this.server.models();

    const client = server.app.chatClient;
    const user = await User.query().where('id', userId);
    let chatId = user[0].chat_id;
    chatId = `@${chatId}:navgurukul.org`;
    const classesOfUser = await RecurringClasses.query().select('cohort_room_id');
    const roomsOfClasses = [];
    _.map(classesOfUser, (n) => {
      if (n.cohort_room_id != null) {
        roomsOfClasses.push(n.cohort_room_id);
      }
    });
    const privateRoomId = await botFunctions.getPrivateRoomId(chatId, roomsOfClasses);

    if (privateRoomId === null || privateRoomId === 'user_not_found') return;

    if (user[0].lang_1 == null) {
      await client.sendMessage(privateRoomId, botHandling.classDropout.en);
    } else {
      await client.sendMessage(privateRoomId, botHandling.classDropout[user[0].lang_1]);
    }
  }

  async sendScheduledReminder(privateRoomId, classDetails) {
    const client = this.server.app.chatClient;
    const { title, type, meet_link } = classDetails;
    const message = _.cloneDeep(botHandling.classReminder);
    message.label = message.label.replace('--CLASS--', title);
    message.body = message.body.replace('^TYPE^', type);
    message.options[0].value = message.options[0].value.replace('^MEET_LINK^', meet_link);
    return client.sendEvent(privateRoomId, 'm.room.message', message, '');
  }

  async askClassFeedback(privateRoomId, classDetails) {
    const client = this.server.app.chatClient;
    const { id, title, type, facilitator_name } = classDetails;
    const message = _.cloneDeep(botHandling.classFeedbackFirst);
    message.body = message.body.replace('/---TITLE---/', title);
    message.label = message.label.replace(/---TITLE---/g, title);
    message.label = message.label.replace(/---TYPE---/g, type);
    if (facilitator_name) {
      message.label = message.label.replace('.---by FACILITATOR---', ` by ${facilitator_name}`);
    } else {
      message.label = message.label.replace('.---by FACILITATOR---', '');
    }
    message.options[0].value = message.options[0].value.replace(
      `class_attended_true`,
      `class_attended_true_${id}`
    );
    return client.sendEvent(privateRoomId, 'm.room.message', message, '');
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

  async userUpdateName(name, chatId, token) {
    this.name = name;
    this.token = token;
    this.chatId = chatId;
    await axiosUnAuth
      .put(
        `/_matrix/client/r0/profile/%40${this.chatId}%3Anavgurukul.org/displayname`,
        { displayname: this.name },
        {
          headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        }
      )
      .then((res) => {
        return res;
      })
      .catch((err) => {
        return err;
      });
  }

  async userUpdateProfile(imgIndex, name, userId) {
    this.userId = `@${userId}:navgurukul.org`;
    this.displayName = name;
    const imgURL = {
      1: 'mxc://navgurukul.org/JBeIWOcUDHnKZnrTZBcCCQPA',
      2: 'mxc://navgurukul.org/dkpWgdEOfMmmbVOopqcHbFHP',
      3: 'mxc://navgurukul.org/flKuozKZvdqUUhnDWkEkuNgg',
      4: 'mxc://navgurukul.org/NuFCQMjsqBgUHnIncGxfqaFx',
      5: 'mxc://navgurukul.org/anKDPJlUxVNYpNTLOSytkQFr',
      6: 'mxc://navgurukul.org/GCjvQJcSGBtSavKhzSNNgOAr',
    };
    const data = {
      displayname: this.displayName,
      avatar_url: imgURL[imgIndex],
    };
    await axiosAuth
      .put(`/_synapse/admin/v2/users/${this.userId}`, data)
      .then((res) => {
        return res;
      })
      .catch((err) => {
        return err;
      });
  }

  async userChatLogin(chat_id, chat_password) {
    this.userData = null;
    this.chat_id = chat_id;
    this.chat_password = chat_password;

    this.loginDetails = {
      identifier: {
        type: 'm.id.user',
        user: this.chat_id,
      },
      initial_device_display_name: 'bol.navgurukul.org (Chrome, Linux)',
      password: this.chat_password,
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

  async getMerakiClassRooms() {
    this.rooms = await chatKnex('public.room_aliases')
      .where('room_alias', 'LIKE', '%merakienclass%')
      .orWhere('room_alias', 'LIKE', '%merakihiclass%')
      .orWhere('room_alias', 'LIKE', '%merakispclass%');
    return this.rooms;
  }

  async addUsersToMerakiClass(roomId, userId) {
    this.res = null;
    try {
      this.res = await axiosAuth.post(`/_synapse/admin/v1/join/${roomId}`, {
        user_id: userId,
      });
      return this.res.data;
    } catch {
      return {
        error: true,
        message:
          'Cannot add user to the specified room. Room id could be incorrect or the user is already added to the room.',
      };
    }
  }

  async removeUsersFromCohort(roomId, userId) {
    this.res = null;
    try {
      this.res = await axiosAuth.post(`/_matrix/client/r0/rooms/${roomId}/kick`, {
        reason: 'User unregistered from the class',
        user_id: userId,
      });
      return this.res.data;
    } catch (err) {
      return {
        error: true,
        message:
          'Cannot remove user to the specified room. Room id could be incorrect or the user is already removed from the room.',
      };
    }
  }

  async sendInitialMessageToStudent(title, id) {
    try {
      const { server } = this;
      const { User, RecurringClasses } = this.server.models();
      const client = server.app.chatClient;
      const user = await User.query().where('id', id);
      const classesOfUser = await RecurringClasses.query().select('cohort_room_id');
      const roomsOfClasses = [];
      _.map(classesOfUser, (n) => {
        if (n.cohort_room_id != null) {
          roomsOfClasses.push(n.cohort_room_id);
        }
      });
      let chatId = user[0].chat_id;
      chatId = `@${chatId}:navgurukul.org`;
      const privateRoomId = await botFunctions.getPrivateRoomId(chatId, roomsOfClasses);
      if (user[0].lang_1 == null) {
        const message = await botHandling.initialCohortMessageForStudents(
          title,
          user[0].name,
          'en'
        );
        await client.sendMessage(privateRoomId, message);
      } else {
        const message = await botHandling.initialCohortMessageForStudents(
          title,
          user[0].name,
          user[0].lang_1
        );
        await client.sendMessage(privateRoomId, message);
      }
      return this.res.data;
    } catch {
      return {
        error: true,
        message: 'Could not send message.',
      };
    }
  }

  async sendInitialMessageToFacilitator(roomId, id) {
    try {
      const { server } = this;
      const { User } = this.server.models();
      const client = server.app.chatClient;
      const user = await User.query().where('id', id);
      const message = await botHandling.initialCohortMessageForFacilitator(user[0].name);
      await client.sendMessage(roomId, message);
      return this.res.data;
    } catch {
      return {
        error: true,
        message: 'Could not send message',
      };
    }
  }
};
