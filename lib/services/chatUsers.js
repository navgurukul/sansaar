const Schmervice = require('schmervice');

const axiosInstance = require('../network/axios');

module.exports = class ChatUsersService extends Schmervice.Service {
  async getAllUsers(queryOptions) {
    const qParams = queryOptions;
    const allChatUsers = await axiosInstance.get('/_synapse/admin/v2/users', {
      params: qParams,
    });
    return allChatUsers.data;
  }

  async getUser(userId) {
    const chatUser = await axiosInstance.get(`/_synapse/admin/v2/users/${userId}`);
    return chatUser.data;
  }

  async createChatUser(userDetails) {
    const uDetails = userDetails;
    let data;
    await axiosInstance
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
    let data;
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
      await axiosInstance
        .post('/_matrix/client/r0/login', loginDetails)
        .then((res) => {
          data = res.data;
        })
        .catch((err) => {
          data = err;
        });
      return data;
    }
  }
};
