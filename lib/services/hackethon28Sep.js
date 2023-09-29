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
    const { email } = data;
    let durations = 1;
    data.durations = durations;
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
    const { MerakiHackathon28Sep } = this.server.models();
    try {
      const GetData = await MerakiHackathon28Sep.query();
      return [null, GetData];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }
};
