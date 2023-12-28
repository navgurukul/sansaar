const CONSTANTS = require('../config');
const Schmervice = require('schmervice');
const logger = require('../../server/logger');

module.exports = class Hackathon20DecemberService extends Schmervice.Service {
    async createHackathonSignup(payload) {
        console.log(payload, "payload");
        const { HackathonLogin } = this.server.models();
        let errorData = {
            Error: true,
            code: 403,
            message: `This email is already registered with us. Please try with another email.`,
        };
        try {
            const checkEmailExists = await HackathonLogin.query().where('email', payload.email);
            if (checkEmailExists.length > 0) {
                return [errorData, null];
            } else {
                await HackathonLogin.query().insert(payload);
                let userData = await HackathonLogin.query().where('email', payload.email);
                return [null, { message: "User registered successfully.", data: userData[0] }];
            }
        } catch (error) {
            logger.error(JSON.stringify(error));
            return [error, null];
        }
    }


    async createHackathonLogin(payload) {
        const { HackathonLogin } = this.server.models();
        try {
            let login = await HackathonLogin.query().where('email', payload.email).andWhere('password', payload.password);
                if (login.length > 0) {
                    return [null, {message:"User is logged in successfully.", data: login[0]}]
                } 
            let checkEmailExists = await HackathonLogin.query().where('email', payload.email);
            if (checkEmailExists.length > 0) {
                return [
                    {
                        Error: true,
                        code: 403,
                        message: `Email or Password may be wrong, please again.`,
                    },
                    null,
                ];
            } else {
                return [
                    {
                        Error: true,
                        code: 403,
                        message: `This email is not registered with us. Please register first.`,
                    },
                    null,
                ];
            }

        } catch (err) {
            logger.error(JSON.stringify(err));
            return [err, null];
        }
    }
}