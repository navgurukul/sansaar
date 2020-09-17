const Schmervice = require('schmervice');
const JWT = require('jsonwebtoken');
const _ = require('lodash');
const { OAuth2Client } = require('google-auth-library');
const Boom = require('@hapi/boom');
const CONFIG = require('../config');

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

  async loginWithGoogle(authDetails, txn) {
    const { idToken, mode } = authDetails;
    const { User } = this.server.models();
    let googleClient;
    let googleClientId;
    if (mode === 'web') {
      googleClientId = CONFIG.auth.googleClientIDWeb;
    } else if (mode === 'andriod') {
      googleClientId = CONFIG.auth.googleClientIDAndroid;
    }
    googleClient = new OAuth2Client(googleClientId);
    const response = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });

    const userObj = {
      email: response.payload.email,
      name: response.payload.name,
      profile_picture: response.payload.picture,
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

  async addPathways(userId, pathwayIds, txn) {
    const { StudentPathway } = this.server.models();
    const conflictingPathways = await StudentPathway.query(txn)
      .where({ user_id: userId })
      .whereIn('pathway_id', pathwayIds);
    if (conflictingPathways.length > 0) {
      throw Boom.badRequest('Given user is already a part of one or more pathways given.');
    }

    const pathways = pathwayIds.map((id) => ({ user_id: userId, pathway_id: id }));
    await StudentPathway.query(txn).insert(pathways);

    return userId;
  }

  async removePathways(userId, pathwayIds, txn) {
    const { StudentPathway } = this.server.models();

    const pathwaysToDelete = await StudentPathway.query(txn)
      .where({ user_id: userId })
      .whereIn('pathway_id', pathwayIds);
    if (pathwaysToDelete.length !== pathwayIds.length) {
      throw Boom.badRequest('User does not have membership of some pathways marked for removal.');
    }

    await StudentPathway.query(txn)
      .whereIn(
        'id',
        pathwaysToDelete.map((p) => p.id)
      )
      .del();
    return userId;
  }
};
