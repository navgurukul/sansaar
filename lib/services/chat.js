const Schmervice = require('schmervice');

module.exports = class ChatService extends Schmervice.Service {
  async handleCommand(roomId, event) {
    // eslint-disable-next-line no-console
    console.log(event, roomId, this.server.chatClient());
  }
};
