const Schmervice = require('schmervice');
const JWT = require('jsonwebtoken');
const _ = require('lodash');
const { OAuth2Client } = require('google-auth-library');
const Boom = require('@hapi/boom');
const Crypto = require('crypto');
const generateRandomAnimalName = require('random-animal-name-generator');
const { errorHandler } = require('../errorHandling');
const { profilePicture } = require('../helpers/assets/profilePicture');
const { randomGenerator, randomProfileImage } = require('../helpers');
const CONFIG = require('../config');

module.exports = class UserService extends Schmervice.Service {
  async findById(id, graphFetchRelation = '', txn) {
    const { User } = this.server.models();
    let user;
    try {
      user = await User.query(txn)
        .throwIfNotFound()
        .findById(id)
        .withGraphFetched(graphFetchRelation);
      return [null, user];
    } catch (err) {
      const error = errorHandler(err);
      error.message = 'User not found';
      return [error, null];
    }
  }

  async findByListOfIds(ids, filterKey = null, txn) {
    const { User } = this.server.models();
    let user;
    try {
      if (filterKey) {
        user = await User.query(txn).select(filterKey).whereIn('id', ids);
      } else {
        user = await User.query(txn).whereIn('id', ids);
      }
      return [null, user];
    } catch (err) {
      const error = errorHandler(err);
      error.message = 'Users not found';
      return [error, null];
    }
  }

  async find(txn) {
    const { User } = this.server.models();
    return User.query(txn);
  }

  async updateById(id, payload) {
    const { User } = this.server.models();
    const { name, partner_id, lang_1, lang_2 } = payload;
    let user;
    try {
      user = await User.query()
        .patchAndFetchById(id, { name, partner_id, lang_1, lang_2 })
        .skipUndefined();
      return [null, user];
    } catch (err) {
      return [errorHandler(err), null];
    }
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
    try {
      await User.query(txn).upsertGraph(updateObj);
      return [null, id];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async addRoles(id, rolesList, txn) {
    const { UserRole } = this.server.models();

    // const roles = await UserRole.query(txn).where({ user_id: id });

    // check which roles in the rolesList don't exist in db
    // const newRoles = _.filter(rolesList, (r) => _.find(roles, { role: r }) === undefined);
    // if (newRoles.length !== rolesList.length) {
    //   throw Boom.forbidden('Some roles given are already assigned to the user.');
    // }
    try {
      await UserRole.query(txn).insert(_.map(rolesList, (r) => ({ role: r, user_id: id })));
      return [null, id];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async removeRoles(id, rolesList, txn) {
    const { UserRole } = this.server.models();

    const roles = await UserRole.query(txn).where({ user_id: id });
    const notFoundRoles = [];
    // check if the roles list has some roles which are not assigned to the user
    _.forEach(rolesList, (roleName) => {
      const userRole = _.find(roles, { role: roleName });
      if (!userRole) {
        notFoundRoles.push(roleName);
      }
    });

    let rolesToRemove = _.filter(roles, (r) => rolesList.indexOf(r.role) > -1);
    rolesToRemove = _.map(rolesToRemove, (r) => r.id);
    try {
      await UserRole.query(txn).delete().throwIfNotFound().whereIn('id', rolesToRemove);
      return [null, id];
    } catch (err) {
      const error = errorHandler(err);
      error.message = `${notFoundRoles.join(
        ', '
      )} role(s) not assigned to the user. Cannot remove it`;
      return [error, null];
    }
  }

  async createUser() {
    const { User } = this.server.models();
    const randomName = `${generateRandomAnimalName()}`;
    const randomEmail = `${randomGenerator(randomName).id}@fake.com`;
    const profile_picture = randomProfileImage(profilePicture);
    const userDetails = {
      name: randomName,
      email: randomEmail,
      profile_picture,
    };
    // const ifExists = await User.query().where('email', userDetails.email);
    // if (ifExists.length > 0) {
    //   throw Boom.badData('Email Already Exists');
    // }
    let newUser;
    try {
      newUser = await User.query().insert(userDetails);
      return [null, newUser];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async loginWithGoogle(authDetails, txn) {
    const { idToken, mode } = authDetails;
    const { User } = this.server.models();
    let first_time_login = false;

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

    const userObj = {
      email: response.payload.email,
      name: response.payload.name,
      google_user_id: response.payload.sub,
    };
    const user = await User.query(txn).findOne({ email: userObj.email });

    // If user is linking google account
    if (authDetails.id !== undefined) {
      if (user) {
        throw Boom.badRequest('Email Already Exists');
      }
      await User.query(txn).update(userObj).where('id', authDetails.id);
      return {
        user: await User.query().findOne({ email: userObj.email }),
      };
    }

    // If user is signing up
    if (!user) {
      userObj.profile_picture = randomProfileImage(profilePicture);
      await User.query(txn).insert(userObj);
      first_time_login = true;
    }
    return { user: await User.query().findOne({ email: userObj.email }), first_time_login };
  }

  createToken = (user) => {
    const JWTtoken = JWT.sign({ id: user.id, email: user.email }, CONFIG.auth.jwt.secret, {
      algorithm: 'HS256',
      expiresIn: CONFIG.auth.jwt.expiresIn,
    });
    return JWTtoken;
  };

  async storeUserTokens(payload) {
    const { UserTokens } = this.server.models();
    const checkIfExists = await UserTokens.query().where('user_id', payload.user_id);
    try {
      if (checkIfExists.length > 0) {
        await UserTokens.query().update(payload).where('user_id', payload.user_id);
      } else {
        await UserTokens.query().insert(payload);
      }
      return [null, { success: true }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getUserTokens(user_id) {
    const { UserTokens } = this.server.models();
    try {
      const token = await UserTokens.query().where('user_id', user_id).throwIfNotFound();
      return [null, { success: true }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

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
    // const conflictingPathways = await StudentPathways.query(txn)
    //   .where({ user_id: userId })
    //   .whereIn('pathway_id', pathwayIds);
    // if (conflictingPathways.length > 0) {
    //   throw Boom.badRequest('Given user is already a part of one or more pathways given.');
    // }

    const pathways = pathwayIds.map((id) => ({ user_id: userId, pathway_id: id }));
    try {
      await StudentPathways.query(txn).insert(pathways);
      return [null, userId];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async removePathways(userId, pathwayIds, txn) {
    const { StudentPathways } = this.server.models();

    // if (pathwaysToDelete.length !== pathwayIds.length) {
    //   throw Boom.badRequest('User does not have membership of some pathways marked for removal.');
    // }

    try {
      const pathwaysToDelete = await StudentPathways.query(txn)
        .where({ user_id: userId })
        .whereIn('pathway_id', pathwayIds)
        .throwIfNotFound();
      await StudentPathways.query(txn)
        .whereIn(
          'id',
          pathwaysToDelete.map((p) => p.id)
        )
        .throwIfNotFound()
        .del();
      return [null, userId];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getUserClassRecords(id, email) {
    const { Classes } = this.server.models();
    let classesConducted;
    try {
      classesConducted = await Classes.query()
        .skipUndefined()
        .where('facilitator_id', id)
        .orWhere('facilitator_email', email)
        .withGraphFetched('[users, feedbacks]');
      return [null, classesConducted];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getUserByEmail(email) {
    const { User } = this.server.models();
    let user;
    try {
      user = await User.query()
        .select(`id`, `name`, `email`, `chat_id`)
        .throwIfNotFound()
        .whereRaw(`email LIKE ? `, [`%${email}%`]);
      return [null, user];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
