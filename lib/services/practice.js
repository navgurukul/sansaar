const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const { errorHandler } = require('../errorHandling');

module.exports = class PracticeService extends Schmervice.Service {
  async addPractice(user_id) {
    const { Practice } = this.server.models();
    // console.log(user_id, "pooja")
    try {
      console.log(user_id, "Done")
      const demo = await Practice
        .query()
        .insert({ user_id })
      console.log(demo, "Successfull")
      return [demo,"successfull"]
    } catch (error) {
      console.log("All good")
      return [errorHandler(error), null];
    }
  }

  async findall() {
    const { Practice } = this.server.models();
    try{
      const demo=await Practice
      .query()
      console.log(demo,"successfull")
      return [demo,"successfull"]
    } catch (error) {
      console.log("error");
      return [errorHandler(error), null];
      }
  }

  async updateDataById(id, user_id) {
    const { Practice } = this.server.models();
    try{
        const demo = await Practice.query()
        .where("id",id).update({user_id})
        console.log(demo,"update successfully")
        return [demo,"Updated data"]   
    }catch (error) {
      // console.log("error");
      return [errorHandler(error),null];
    }
  }

    async deleteDataById(id) {
      const { Practice }  = this.server.models();
      try {
          const demo=await Practice.query().delete().where('id', id)
          console.log(demo,'Data Deleted')
          return ["successfull"]
      }catch (error) {
        console.log("error");
        return [errorHandler(error), null];
      }
}
}