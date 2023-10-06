/* eslint-disable prettier/prettier */
/* eslint-disable class-methods-use-this */
const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const Strapi = require('strapi-sdk-js');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const assessmentConverter = require('../helpers/strapiToMeraki/assessmentConverter');
const { async } = require('crypto-random-string');

const strapi = new Strapi({
  url: process.env.STRAPI_URL,
});
module.exports = class Hackthone28Sep extends Schmervice.Service {
  async merakiTrackdata(data) {
    const { MerakiHackathon28Sep } = this.server.models();
    const { user_id, email, durations } = data;
    try {
      const GetData = await MerakiHackathon28Sep.query().where('email', email);
      if (GetData.length > 0) {
        let durations = GetData[0].durations+1;
        const UpdateData = await MerakiHackathon28Sep.query()
          .update({
            durations: durations,
          })
          .where('email', email);
        return [null, UpdateData];
      } else {
        let MerakiData = await MerakiHackathon28Sep.query().insert(data);
        return [null, MerakiData];
      }
    } catch (error) {
<<<<<<< HEAD
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getIDbyEmail(data) {
    const { MerakiHackathon28Sep } = this.server.models();
    const { email } = data;
    try {
      const GetData = await MerakiHackathon28Sep.query().where('email', email).select('user_id');
      if(GetData.length > 0){
        return [null, GetData]
      }
      else{
        return [null, {message:'this email is not found'}]
      }
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getAllData() {
    const { MerakiHackathon28Sep,User } = this.server.models();
    try {
      // const GetData = await MerakiHackathon28Sep.query();
      const new_data = []
      const GetData = await MerakiHackathon28Sep.query()
      for (let ind = 0; ind < GetData.length; ind++) {
        const element = GetData[ind];
        let user_data = await User.query().where('id', element.user_id).select('name','profile_picture');
        element.name = user_data[0].name;
        element.profile_picture = user_data[0].profile_picture;
        new_data.push(element);
      }
      // .join('users', 'users.id', 'merakihackthon.user_id')
      // .select('users.name','users.profile_picture', 'merakihackthon.*');
      return [null, new_data];
    } catch (error) { 
      console.log(error,'eeeeeeeeeeeeeeeeeeeeeeeeeee');
=======
        console.log(error,'this is error.....');
>>>>>>> parent of 9bca5ab7 (Merge pull request #1270 from navgurukul/28SepHackThone)
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }
};
