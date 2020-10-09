// eslint-disable-next-line
const { axiosAuth, axiosUnAuth } = require('../helpers/network/chat');
const botHandling = require('../helpers/bot/index');

const server = this.deployment();
const client = server.app.chatClient;

const joinARoom = async (sender, roomId, roomAlias) => {
  const roomIdToJoin = botHandling.getRoomId(roomAlias);
  if (roomIdToJoin !== undefined) {
    await axiosAuth.post(`/_matrix/client/r0/rooms/${roomIdToJoin}/invite`, {
      user_id: sender,
    });
    await axiosAuth.post(`/_synapse/admin/v1/join/${roomIdToJoin}`, {
      user_id: sender,
    });
    return client.sendMessage(roomId, {
      msgtype: 'text',
      body: `Successfully added you to room ${roomAlias}`,
    });
  }
  return client.sendMessage(roomId, {
    msgtype: 'text',
    body: `${roomAlias} doesn't exist. Please enter correct room name`,
  });
};

const selectALanguage = async (roomId) => {
  await client.sendEvent(roomId, 'm.room.message', botHandling.letStartCoding, '');
};

module.exports = {
  selectALanguage,
  joinARoom,
};
