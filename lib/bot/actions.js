const { chatKnex } = require('../../server/knex');
const { axiosAuth } = require('../helpers/network/chat');
const botHandling = require('./index');
const CONFIG = require('../config/index');

const createARoom = async (payload) => {
  const { visibility, roomAliasName, name, topic } = payload;
  let createdRoom;

  const createPayload = {
    initial_state: [],
    visibility,
    preset: visibility === 'private' ? 'private_chat' : 'public_chat',
    name,
    topic,
  };
  if (roomAliasName) createPayload.room_alias_name = roomAliasName;
  await axiosAuth
    .post(`/_matrix/client/r0/createRoom`, createPayload)
    .then((res) => {
      createdRoom = res.data;
    })
    .catch((err) => {
      createdRoom = {
        error: true,
        message: err.response.data,
        code: parseInt(err.response.status, 10),
      };
    });
  return createdRoom;
};

const joinARoom = async (client, sender, roomIdToJoin, roomAlias, privateRoomIdWithMeraki) => {
  if (roomIdToJoin !== undefined) {
    await axiosAuth.post(`/_matrix/client/r0/rooms/${roomIdToJoin}/invite`, {
      user_id: sender,
    });
    await axiosAuth.post(`/_synapse/admin/v1/join/${roomIdToJoin}`, {
      user_id: sender,
    });
    if (roomAlias.includes(`class`)) {
      await client.sendMessage(privateRoomIdWithMeraki, {
        msgtype: 'text',
        body: `Hi, I have added you to a group where you will be shared regular information on classes.`,
      });
      return client.sendMessage(privateRoomIdWithMeraki, {
        msgtype: 'text',
        body: `You can ask all queries over there. Let us know if you have any feedback.`,
      });
    }
    return client.sendMessage(privateRoomIdWithMeraki, {
      msgtype: 'text',
      body: `Successfully added you to ${roomAlias} room`,
    });
  }
  return client.sendMessage(roomIdToJoin, {
    msgtype: 'text',
    body: `${roomAlias} doesn't exist. Please enter correct room name`,
  });
};

const languageSelected = async (client, roomId, lang) => {
  await client.sendEvent(roomId, 'm.room.message', botHandling.letStartCoding[lang], '');
};

const getPrivateRoomId = async (userChatId, rooms) => {
  if (userChatId && rooms !== [] && rooms !== undefined) {
    const privateRoomId = await chatKnex('public.users_who_share_private_rooms')
      .where('user_id', userChatId)
      .andWhere('other_user_id', CONFIG.auth.chat.merakiUserId);
    if (privateRoomId.length > 0) {
      let roomLength;
      // eslint-disable-next-line
      for (const room in privateRoomId) {
        if (!(rooms.indexOf(privateRoomId[room].room_id) > -1)) {
          // eslint-disable-next-line
          roomLength = await chatKnex('public.users_who_share_private_rooms')
            .count('*')
            .where('room_id', privateRoomId[room].room_id);
          if (roomLength[0].count === '2') {
            return privateRoomId[room].room_id;
          }
        }
      }
      return privateRoomId[0].room_id;
    }
    return 'user_not_found';
    // eslint-disable-next-line
  } else if (userChatId) {
    const privateRoomId = await chatKnex('public.users_who_share_private_rooms')
      .where('user_id', userChatId)
      .andWhere('other_user_id', CONFIG.auth.chat.merakiUserId);
    if (privateRoomId.length > 0) {
      let roomLength;
      // eslint-disable-next-line
      for (const room in privateRoomId) {
        // eslint-disable-next-line
        roomLength = await chatKnex('public.users_who_share_private_rooms')
          .count('*')
          .where('room_id', privateRoomId[room].room_id);
        if (roomLength[0].count === '2') {
          return privateRoomId[room].room_id;
        }
      }
      return privateRoomId[0].room_id;
    }
  }
  return chatKnex('public.users_who_share_private_rooms').where(
    'other_user_id',
    CONFIG.auth.chat.merakiUserId
  );
};

const getPublicRoomId = async (roomAlias) => {
  const publicRoomId = await chatKnex('public.room_aliases')
    .whereRaw(`room_alias LIKE ? `, [`%${roomAlias}%`])
    .andWhere(`creator`, CONFIG.auth.chat.merakiUserId);
  return publicRoomId;
};

const getPublicRoomUserLists = async (roomId) => {
  const publicRoomUsers = await chatKnex('public.users_in_public_rooms').where('room_id', roomId);
  return publicRoomUsers;
};

module.exports = {
  languageSelected,
  joinARoom,
  createARoom,
  getPrivateRoomId,
  getPublicRoomId,
  getPublicRoomUserLists,
};
