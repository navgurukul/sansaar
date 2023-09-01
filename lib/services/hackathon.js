const CONSTANTS = require('../config');
const axios = require('axios');
const Schmervice = require('schmervice');
const path = require('path');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const Dotenv = require('dotenv');
const AWS = require('aws-sdk');
Dotenv.config({ path: `${__dirname}/../../server/.env` });
const uuid = require('uuid');


module.exports = class HackathonUserService extends Schmervice.Service {
    // Create a new user
    async createNewUser(usersData) {
        const { Hackathon } = this.server.models();
        try {
            // Generate a UUID (Universally Unique Identifier)
            const generatedUuid = uuid.v4().replace(/-/g, '').substring(0, 10);
            let checkUser = await Hackathon.query().where('user_id', generatedUuid);
            if (checkUser.length > 0) {
                return [{ error: true, message: `User with user_id ${generatedUuid} already exists! Please try with another user_id`, code: 403 }, null];
            }
            else {
                usersData.user_id = generatedUuid;
                let newUser = await Hackathon.query().insert(usersData);
                return [null, newUser];
            }
        } catch (err) {
            return [errorHandler(err), null];
        }
    }

    // Login
    async login(usersData) {
        const { Hackathon } = this.server.models();
        try {
            let checkUser = await Hackathon.query().where('user_id', usersData.user_id).andWhere('password', usersData.password);
            if (checkUser.length > 0) {
                return [null, { message: 'User logged in successfully', code: 200 }];
            }
            else {
                return [{ error: true, message: 'user_id or password is incorrect! Please try again', code: 403 }, null];
            }
        } catch (err) {
            return [errorHandler(err), null];
        }
    }

    //getUserByUserId
    async getUserByUserId(user_id) {
        const { Hackathon } = this.server.models();
        try {
            let checkUser = await Hackathon.query().where('user_id', user_id);
            if (checkUser.length > 0) {
                return [null, checkUser];
            }
            else {
                return [{ error: true, message: 'User not found! Please try with another user_id', code: 403 }, null];
            }
        } catch (err) {
            return [errorHandler(err), null];
        }
    }

    // -----------------------------------------------------------------------------------------------------------------------------------
    // GTA Game

    // Create a new user
    async gtacreateNewUser(usersData) {
        const { Gtagame } = this.server.models();
        try {
            // Generate a UUID (Universally Unique Identifier)
            const generatedUuid = uuid.v4().replace(/-/g, '').substring(0, 10);
            let checkUser = await Gtagame.query().where('user_id', generatedUuid);
            if (checkUser.length > 0) {
                return [{ error: true, message: `User with user_id ${generatedUuid} already exists! Please try with another user_id`, code: 403 }, null];
            }
            else {
                usersData.user_id = generatedUuid;
                let newUser = await Gtagame.query().insert(usersData);
                return [null, newUser];
            }
        } catch (err) {
            return [errorHandler(err), null];
        }
    }

    // Login
    async gtalogin(usersData) {
        const { Gtagame } = this.server.models();
        try {
            console.log(usersData,'usersData');
            let checkUser = await Gtagame.query().where('user_id', usersData.user_id).andWhere('password', usersData.password);
            console.log(checkUser,'checkUser');
            if (checkUser.length > 0) {
                return [null, { message: 'User logged in successfully', code: 200 }];
            }
            else {
                return [{ error: true, message: 'user_id or password is incorrect! Please try again', code: 403 }, null];
            }
        } catch (err) {
            console.log(err,'err')
            return [errorHandler(err), null];
        }
    }

    //getUserByUserId
    async gtagetUserByUserId(user_id) {
        const { Gtagame } = this.server.models();
        try {
            let checkUser = await Gtagame.query().where('user_id', user_id);
            if (checkUser.length > 0) {
                return [null, checkUser];
            }
            else {
                return [{ error: true, message: 'User not found! Please try with another user_id', code: 403 }, null];
            }
        } catch (err) {
            return [errorHandler(err), null];
        }
    }

    // -----------------------------------------------------------------------------------------------------------------------------------
    // News App

    // Create a new user
    async newsAppCreateNewUser(usersData) {
        const { Newsapp } = this.server.models();
        try {
            // Generate a UUID (Universally Unique Identifier)
            const generatedUuid = uuid.v4().replace(/-/g, '').substring(0, 10);
            let checkUser = await Newsapp.query().where('user_id', generatedUuid);
            if (checkUser.length > 0) {
                return [{ error: true, message: `User with user_id ${generatedUuid} already exists! Please try with another user_id`, code: 403 }, null];
            }
            else {
                usersData.user_id = generatedUuid;
                let newUser = await Newsapp.query().insert(usersData);
                return [null, newUser];
            }
        } catch (err) {
            return [errorHandler(err), null];
        }
    }

    // Login
    async newsAppLogin(usersData) {
        const { Newsapp } = this.server.models();
        try {
            let checkUser = await Newsapp.query().where('user_id', usersData.user_id).andWhere('password', usersData.password);
            if (checkUser.length > 0) {
                return [null, { message: 'User logged in successfully', code: 200 }];
            }
            else {
                return [{ error: true, message: 'user_id or password is incorrect! Please try again', code: 403 }, null];
            }
        } catch (err) {
            return [errorHandler(err), null];
        }
    }

    //getUserByUserId
    async newsAppGetUserByUserId(user_id) {
        const { Newsapp } = this.server.models();
        try {
            let checkUser = await Newsapp.query().where('user_id', user_id);
            if (checkUser.length > 0) {
                return [null, checkUser];
            }
            else {
                return [{ error: true, message: 'User not found! Please try with another user_id', code: 403 }, null];
            }
        } catch (err) {
            return [errorHandler(err), null];
        }
    }

    // -----------------------------------------------------------------------------------------------------------------------------------
    // Talk Mitra

    // Create a new user
    async talkMitraCreateNewUser(usersData) {
        const { Talkmitra } = this.server.models();
        try {
            // Generate a UUID (Universally Unique Identifier)
            const generatedUuid = uuid.v4().replace(/-/g, '').substring(0, 10);
            let checkUser = await Talkmitra.query().where('user_id', generatedUuid);
            if (checkUser.length > 0) {
                return [{ error: true, message: `User with user_id ${generatedUuid} already exists! Please try with another user_id`, code: 403 }, null];
            }
            else {
                usersData.user_id = generatedUuid;
                let newUser = await Talkmitra.query().insert(usersData);
                return [null, newUser];
            }
        } catch (err) {
            return [errorHandler(err), null];
        }
    }

    // Login
    async talkMitraLogin(usersData) {
        const { Talkmitra } = this.server.models();
        try {
            let checkUser = await Talkmitra.query().where('user_id', usersData.user_id).andWhere('password', usersData.password);
            if (checkUser.length > 0) {
                return [null, { message: 'User logged in successfully', code: 200 }];
            }
            else {
                return [{ error: true, message: 'user_id or password is incorrect! Please try again', code: 403 }, null];
            }
        } catch (err) {
            return [errorHandler(err), null];
        }
    }

    //getUserByUserId
    async talkMitraGetUserByUserId(user_id) {
        const { Talkmitra } = this.server.models();
        try {
            let checkUser = await Talkmitra.query().where('user_id', user_id);
            if (checkUser.length > 0) {
                return [null, checkUser];
            }
            else {
                return [{ error: true, message: 'User not found! Please try with another user_id', code: 403 }, null];
            }
        } catch (err) {
            return [errorHandler(err), null];
        }
    }

};