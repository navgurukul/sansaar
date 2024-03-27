/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-unused-vars */
/* eslint-disable prefer-destructuring */
const Schmervice = require('schmervice');
const JWT = require('jsonwebtoken');
const _ = require('lodash');
const { OAuth2Client } = require('google-auth-library');
const Boom = require('@hapi/boom');
const Crypto = require('crypto');
const Chance = require('chance');
const querystring = require('querystring');
const fs = require('fs-extra');

const chance = new Chance();

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
        .withGraphFetched(graphFetchRelation)
        .withGraphFetched('c4ca_roles');
      const roles = user.c4ca_roles.map(({ role }) => role);
      user.c4ca_roles = roles;
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

  // takes a URL as input and extracts a payload object from the URL's query string.
  // eslint-disable-next-line class-methods-use-this
  async extractPayloadFromURL(url, payload) {
    try{
      if(typeof url !== 'string'|| url.trim()===''){
        return ['Invalid URl', null];
      } 
      const [head, string] = url.split('referrer=utm_source');
      if (typeof string !== 'string') {
        // Handle the case where 'string' is not a valid string
        return ['Invalid URL format', null];
      }
      const decodedString = decodeURIComponent(string.substring(1));
      const result = querystring.parse(decodedString);
      
      const { utm_content } = result;
      
      if (typeof utm_content === 'string' && utm_content.includes('partner_id')) {
        const str = utm_content.split('=')[0];
        const [key, value] = str.split(':');
        payload[key] = value;
      } else if (Array.isArray(utm_content)) {
        utm_content.forEach((__string) => {
          let str;
          if (__string.includes('=')) {
            str = __string.split('=')[0];
          } else {
            str = __string;
          }
          const [key, value] = str.split(':');
          payload[key] = value;
        });
      } else {
        return [`Wrong URL: ${url}`, null];
      }
      return [null, payload];
    }
    catch(err){
      return [err.message, null];
    }
  }

  async updateById(id, payload) {
    const { User, C4caRole } = this.server.models();
    try {
      let userData;
      if(payload.profile_picture){
      const url = payload.profile_picture.replace(/ /g, '%20');
      delete payload.profile_picture;
      payload.profile_picture = url;
      }
      if (payload.c4ca_partner_id){
        const rolesToCheck = ['c4caTeacher', 'c4caPartner', 'facilitator'];
        let presentRole = await C4caRole.query()
          .andWhere('user_id', id)
          .whereIn('role', rolesToCheck);

        if(presentRole.length === 0){
            await C4caRole.query().insert({user_id:id,role:"c4caTeacher"})
            userData = await User.query().patchAndFetchById(id, payload).withGraphFetched('c4ca_roles').skipUndefined();
            const roles = userData.c4ca_roles.map(({ role }) => role);
            userData.c4ca_roles = roles;
        } 
      }
      userData = await User.query().patchAndFetchById(id, payload).skipUndefined();
      return [null, userData];
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

  async createUser(lang = null, mode = null) {
    const { User } = this.server.models();
    const randomName = chance.name({ middle: true }).replace(/ /g, '').toLocaleLowerCase();
    const randomEmail = `${randomGenerator(randomName).id}@fake.com`;
    const profile_picture = randomProfileImage(profilePicture);
    const userDetails = {
      name: randomName,
      email: randomEmail,
      profile_picture,
    };
    if (lang) {
      userDetails.lang_1 = lang;
    }
    if (mode) {
      userDetails.mode = mode;
    }

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

  async getPartnerGroupIds(user) {
    const { PartnerGroupUser } = this.server.models();
    try {
      let groups = await PartnerGroupUser.query()
        .select('partner_group_id')
        .where('email', user.email)
        .withGraphFetched('partner_group')
        .modifyGraph('partner_group', (builder) => {
          builder.where('base_group', 'f');
        });
      groups = groups.filter((g) => {
        return g.partner_group != null;
      });

      if (groups.length > 0) {
        return [null, groups[0].partner_group_id];
      }
      return [null, null];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async loginWithGoogle(authDetails, txn) {
    const { idToken, mode, lang } = authDetails;
    const { User } = this.server.models();
    let first_time_login = false;
    const last_login_at = new Date();

    let googleClientId;
    if (mode === 'web') {
      googleClientId = CONFIG.auth.googleClientIDWeb;
    } else if (mode === 'android') {
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
      last_login_at,
    };

    if (lang) {
      userObj.lang_1 = lang;
    }
    if (mode) {
      userObj.mode = mode;
    }

    const user = await User.query(txn).findOne({ email: userObj.email });
    if (user && user.name) {
      userObj.name = user.name;
    }
    await User.query(txn).update(userObj).where({ email: userObj.email });

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
      // if alias email has already loged in
      const google_user_id_user = await User.query(txn).findOne({
        google_user_id: userObj.google_user_id,
      });
      if (google_user_id_user) {
        return {
          user: google_user_id_user,
          first_time_login: false,
        };
      }
      userObj.profile_picture = randomProfileImage(profilePicture);
      await User.query(txn).insert(userObj);
      first_time_login = true;
    }
    return { user: await User.query().findOne({ email: userObj.email }), first_time_login };
  }

  async loginWithGoogleIdentityServices(authDetails, txn) {
    const { idToken, mode, lang } = authDetails;
    const { User } = this.server.models();
    let first_time_login = false;
    const last_login_at = new Date();

    let googleClientId;
    if (mode === 'web') {
      googleClientId = CONFIG.auth.GoogleIdentityServicesClientIDWeb;
    } else if (mode === 'android') {
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
      last_login_at,
    };

    if (lang) {
      userObj.lang_1 = lang;
    }
    if (mode) {
      userObj.mode = mode;
    }

    const user = await User.query(txn).findOne({ email: userObj.email });
    if (user && user.name) {
      userObj.name = user.name;
    }
    await User.query(txn).update(userObj).where({ email: userObj.email });

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
      // if alias email has already loged in
      const google_user_id_user = await User.query(txn).findOne({
        google_user_id: userObj.google_user_id,
      });
      if (google_user_id_user) {
        return {
          user: google_user_id_user,
          first_time_login: false,
        };
      }
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
      let stored;
      if (checkIfExists.length <= 0) {
        stored = await UserTokens.query().insert(payload);
      }
      // eslint-disable-next-line
      return [null, { success: true }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getUserTokens(user_id) {
    const { UserTokens } = this.server.models();
    try {
      // eslint-disable-next-line
      const token = await UserTokens.query().where('user_id', user_id)
      if (token.length > 0) return [null, { success: true }];
      return [null, { success: false }];
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
        .select(`id`, `name`, `email`, `chat_id`,'partner_id',)
        .throwIfNotFound()
        .whereRaw(`email LIKE ? `, [`%${email}%`]);
      return [null, user];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getAllStudent(query) {
    const { User } = this.server.models();
    const { limit, page, name } = query;
    const offset = (page - 1) * limit;
    let students;
    try {
      if (name) {
        students = await User.query()
          .skipUndefined()
          .orderBy('name')
          .limit(limit)
          .offset(offset)
          .whereRaw(`LOWER(name) LIKE ?`, [`%${name.trim().toLowerCase()}%`])
          .withGraphFetched('[registrations, classes, classes.[facilitator],partner]');
      } else {
        students = await User.query()
          .skipUndefined()
          .orderBy('name')
          .limit(limit)
          .offset(offset)
          .withGraphFetched('[registrations, classes, classes.[facilitator],partner]');
      }
      _.forEach(students, (inner) => {
        if (inner.partner !== null && inner.partner.length > 0) {
          // eslint-disable-next-line
          inner.partner = inner.partner[0];
        } else {
          inner.partner = null;
        }
      });
      const length = await User.query().count();
      const data = { students, count: length[0].count };
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async updateContactById(id, contact) {
    const { User } = this.server.models();
    let user;
    try {
      user = await User.query().patchAndFetchById(id, { contact }).skipUndefined();
      return [null, user];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getAllUsers(start_date, end_date) {
    const { User, Certificate } = this.server.models();
    try {
      const allMerakiCertifacate = await Certificate.query()
        .where('created_at', '>=', `${start_date}`)
        .andWhere('created_at', '<', `${end_date}`);
      const alluserDetails = [];
      for (let ind = 0; ind < allMerakiCertifacate.length; ind++) {
        const userDetails = await User.query()
          .where('id', allMerakiCertifacate[ind].user_id)
          .select('id', 'name', 'email', 'contact');
        alluserDetails.push(userDetails[0]);
      }
      return [null, alluserDetails];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }
};
