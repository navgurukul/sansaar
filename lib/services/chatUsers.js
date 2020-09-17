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
};
