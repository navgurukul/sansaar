const CONSTANTS = require('../config');
const axios = require('axios');
const Schmervice = require('schmervice');
const _ = require('lodash');
const csv = require('csv-parser');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const Dotenv = require('dotenv');
const AWS = require('aws-sdk');

Dotenv.config({ path: `${__dirname}/../../server/.env` });


module.exports = class HackathonUserService extends Schmervice.Service {
    // Create a new user
    async createNewUser(usersData) {
        const { Hackathon } = this.server.models();
        try {
            let checkUser = await Hackathon.query().where('user_id', usersData.user_id);
            if (checkUser.length > 0) {
                return [{ error: true, message: `User with user_id ${usersData.user_id} already exists! Please try with another user_id`, code: 403 }, null];
            }
            else {
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
                return [null, {message: 'User logged in successfully', code: 200 }];
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
};