const Schmervice = require('schmervice');
const JWT = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const CONFIG = require('../config');

module.exports = class UserService extends Schmervice.Service {
  async findById(id, txn) {
    const { User } = this.server.models();
    const user = User.query(txn).throwIfNotFound().findById(id);
    return user;
  }

  async loginWithGoogle(idToken, txn) {
    const { User } = this.server.models();
    const googleClient = new OAuth2Client(CONFIG.auth.googleClientID);
    const response = await googleClient.verifyIdToken({
      idToken,
      audience: CONFIG.auth.googleClientID,
    });

    const userObj = {
      user_name: response.payload.name,
      email: response.payload.email,
      profile_pic: response.payload.picture,
      google_user_id: response.payload.sub,
    };

    let user = await User.query(txn).findOne({ email: userObj.email });
    if (!user) {
      user = await User.query(txn).insert(userObj);
    }
    return user;
  }

  createToken = (user) => {
    const JWTtoken = JWT.sign({ id: user.id, email: user.email }, CONFIG.auth.jwt.secret, {
      algorithm: 'HS256',
      expiresIn: CONFIG.auth.jwt.expiresIn,
    });
    return JWTtoken;
  };
};
