const Schmervice = require('schmervice');
const JWT = require('jsonwebtoken');
const _ = require('lodash');
const { OAuth2Client } = require('google-auth-library');
const Boom = require('@hapi/boom');
const Crypto = require('crypto');
const cryptoRandomString = require('crypto-random-string');
const generateRandomAnimalName = require('random-animal-name-generator');
const { profilePicture } = require('../helpers/assets/profilePicture');
const CONFIG = require('../config');

function randomProfileImage(imagesObj) {
  const keys = Object.keys(imagesObj);
  // eslint-disable-next-line
  return imagesObj[keys[(keys.length * Math.random()) << 0]];
}

function randomGenerator(name = '') {
  const nameTrimmed = name.split(' ')[0].toLowerCase();
  return {
    id: `${nameTrimmed}${Math.random().toString(32).substring(2, 10)}`,
    // id: `@${nameTrimmed}${Math.random().toString(32).substring(2, 10)}:navgurukul.org`,
    password: cryptoRandomString({ length: 32, type: 'base64' }),
  };
}

module.exports = class UserService extends Schmervice.Service {
  async findById(id, graphFetchRelation = '', txn) {
    const { User } = this.server.models();
    const user = User.query(txn)
      .throwIfNotFound()
      .findById(id)
      .withGraphFetched(graphFetchRelation);
    return user;
  }

  async find(txn) {
    const { User } = this.server.models();
    return User.query(txn);
  }

  async update(id, { rolesList, ...userInfo }, txn) {
    const { User, UserRole } = this.server.models();

    const updateObj = { id, ...userInfo };

    if (rolesList) {
      const roles = await UserRole.query(txn).where({ user_id: id });
      const dbRolesList = _.map(roles, (role) => role.role);
      const newRoles = _.map(rolesList, (r) => {
        if (dbRolesList.indexOf(r) > -1) {
          return _.find(roles, { role: r });
        }
        return { role: r };
      });
      updateObj.roles = newRoles;
    }

    await User.query(txn).upsertGraph(updateObj);

    return id;
  }

  async addRoles(id, rolesList, txn) {
    const { UserRole } = this.server.models();

    const roles = await UserRole.query(txn).where({ user_id: id });

    // check which roles in the rolesList don't exist in db
    const newRoles = _.filter(rolesList, (r) => _.find(roles, { role: r }) === undefined);
    if (newRoles.length !== rolesList.length) {
      throw Boom.forbidden('Some roles given are already assigned to the user.');
    }

    await UserRole.query(txn).insert(_.map(rolesList, (r) => ({ role: r, user_id: id })));
    return id;
  }

  async removeRoles(id, rolesList, txn) {
    const { UserRole } = this.server.models();

    const roles = await UserRole.query(txn).where({ user_id: id });

    // check if the roles list has some roles which are not assigned to the user
    _.forEach(rolesList, (roleName) => {
      const userRole = _.find(roles, { role: roleName });
      if (!userRole) {
        throw Boom.badRequest(`${roleName} is not assigned the user. Cannot remove it.`);
      }
    });

    let rolesToRemove = _.filter(roles, (r) => rolesList.indexOf(r.role) > -1);
    rolesToRemove = _.map(rolesToRemove, (r) => r.id);
    await UserRole.query(txn).deleteById(rolesToRemove);

    return id;
  }

  async createUser() {
    const { User } = this.server.models();
    const randomName = generateRandomAnimalName();
    const randomEmail = `${randomGenerator(randomName).id}@fake.com`;
    const chat_id = randomGenerator(randomName).id;
    const chat_password = randomGenerator().password;
    const profile_picture = randomProfileImage(profilePicture);
    const userDetails = {
      name: randomName,
      email: randomEmail,
      profile_picture,
      chat_id,
      chat_password,
    };
    const ifExists = await User.query().where('email', userDetails.email);
    if (ifExists.length > 0) {
      throw Boom.badData('Email Already Exists');
    }
    const newUser = await User.query().insert(userDetails);

    return newUser;
  }

  async loginWithGoogle(authDetails, txn) {
    const { idToken, mode } = authDetails;
    const { User } = this.server.models();

    let googleClientId;
    if (mode === 'web') {
      googleClientId = CONFIG.auth.googleClientIDWeb;
    } else if (mode === 'andriod') {
      googleClientId = CONFIG.auth.googleClientIDAndroid;
    }
    const googleClient = new OAuth2Client(googleClientId);

    const response = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });

    let userObj = {
      email: response.payload.email,
      name: response.payload.name,
      google_user_id: response.payload.sub,
    };

    let user = await User.query(txn).findOne({ email: userObj.email });

    // If user provides user_id to link a google account with
    if (authDetails.id !== undefined) {
      // If the account is already linked to another user_id
      if (user) {
        throw Boom.badData('Email Already Exists');
      }
      await User.query(txn).update(userObj).where('id', authDetails.id);
      user = await User.query().findById(authDetails.id);
      const userObject = {
        user,
      };
      return userObject;
    }

    // If user is not found in the database (User is signing up)
    if (!user) {
      userObj = {
        ...userObj,
        chat_id: randomGenerator(response.payload.name).id,
        chat_password: randomGenerator().password,
      };
      // Insert the user details in the database
      user = await User.query(txn).insert(userObj);
      // creating an account in matrix chat if user is successfully updated in the database
      if (user) {
        const { chatService } = this.server.services();
        const newUser = {
          displayName: user.name,
          id: user.chat_id,
          password: user.chat_password,
          threepids: [],
        };
        await chatService.createChatUser(newUser);
        const roomId = await chatService.createChatRoom(newUser.id);
        return { user, roomId };
      }
    }
    return { user };
  }

  createToken = (user) => {
    const JWTtoken = JWT.sign({ id: user.id, email: user.email }, CONFIG.auth.jwt.secret, {
      algorithm: 'HS256',
      expiresIn: CONFIG.auth.jwt.expiresIn,
    });
    return JWTtoken;
  };

  async getGitHubAccessUrl(email, txn) {
    const { User } = this.server.models();
    const user = await User.query(txn).findOne('email', email);
    if (user) {
      const messageId = CONFIG.auth.githubAccessKey.schoolId + user.id.toString();
      const hashDigest = await Crypto.createHmac('sha256', CONFIG.auth.githubAccessKey.secret)
        .update(messageId)
        .digest('hex');
      return `${CONFIG.auth.githubAccessKey.basePath}${CONFIG.auth.githubAccessKey.schoolId}&student_id=${user.id}&signature=${hashDigest}`;
    }
    return false;
  }

  async addPathways(userId, pathwayIds, txn) {
    const { StudentPathways } = this.server.models();
    const conflictingPathways = await StudentPathways.query(txn)
      .where({ user_id: userId })
      .whereIn('pathway_id', pathwayIds);
    if (conflictingPathways.length > 0) {
      throw Boom.badRequest('Given user is already a part of one or more pathways given.');
    }

    const pathways = pathwayIds.map((id) => ({ user_id: userId, pathway_id: id }));
    await StudentPathways.query(txn).insert(pathways);

    return userId;
  }

  async removePathways(userId, pathwayIds, txn) {
    const { StudentPathways } = this.server.models();

    const pathwaysToDelete = await StudentPathways.query(txn)
      .where({ user_id: userId })
      .whereIn('pathway_id', pathwayIds);
    if (pathwaysToDelete.length !== pathwayIds.length) {
      throw Boom.badRequest('User does not have membership of some pathways marked for removal.');
    }

    await StudentPathways.query(txn)
      .whereIn(
        'id',
        pathwaysToDelete.map((p) => p.id)
      )
      .del();
    return userId;
  }
};
