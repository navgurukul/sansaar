const { chatKnex } = require('../../server/knex');
const { axiosAuth } = require('../helpers/network/chat');
const botHandling = require('./index');
const CONFIG = require('../config/index');

const createARoom = async (roomAlias) => {
  let createdRoom;
  const rooms = {
    hi: 'Hindi',
    en: 'English',
  };
  const roomIndexNo = roomAlias.substring(2);
  const prefix = CONFIG.auth.chat.merakiUserId.split(':')[0].substr(1);

  await axiosAuth
    .post(`/_matrix/client/r0/createRoom`, {
      initial_state: [],
      visibility: 'public',
      preset: 'public_chat',
      room_alias_name: `${prefix}${roomAlias.substring(0, 2)}class${roomIndexNo}`,
      name: `${rooms[roomAlias.substring(0, 2)]}-${roomIndexNo}`,
      topic: `${rooms[roomAlias.substring(0, 2)]} Classes - ${roomIndexNo}`,
    })
    .then((res) => {
      createdRoom = res.data;
    })
    .catch((err) => {
      createdRoom = err;
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

const languageSelected = async (client, roomId) => {
  await client.sendEvent(roomId, 'm.room.message', botHandling.letStartCoding, '');
};

const getPrivateRoomId = async (userChatId) => {
  if (userChatId) {
    console.log(userChatId, CONFIG.auth.chat.merakiUserId);
    const privateRoomId = await chatKnex('public.users_who_share_private_rooms')
      .where('user_id', userChatId)
      .andWhere('other_user_id', CONFIG.auth.chat.merakiUserId);
    if (privateRoomId.length > 0) {
      let roomLength;
      privateRoomId.forEach(async (room) => {
        roomLength = await chatKnex('public.users_who_share_private_rooms')
          .count('*')
          .where('room_id', room.room_id);
        if (roomLength === 2) {
          console.log(room.room_id);
          return room.room_id;
        }
        return null;
      });
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
