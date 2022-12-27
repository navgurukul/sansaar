const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
// eslint-disable-next-line no-undef
module.exports = class CourseTransitionsService extends Schmervice.Service {
  //   async CourseTransitions() {
  //     const { CourseTransitions } = this.server.models();
  //     // console.log("llll")

  //     try {
  //       const data = await CourseTransitions.query().insert({
  //         id: 1
  //         course_version_id: 5,
  //         state: mordha,
  //         user_id: 8,
  //       });
  //       return [null, data];
  //     } catch (err) {
  //       console.log(err);
  //       // eslint-disable-next-line no-undef
  //       return [errorHandler(err), null];
  //     }
  //   }
  // async CourseTransitions() {
  //   const { CourseTransitions } = this.server.models();

  //   try {
  //     // const volunteers = await Volunteer.query();
  //     const data = await CourseTransitions.query().select().where('course_id', 1);
  //     console.log(data);
  //     return [null, data];
  //   } catch (err) {
  //     return [errorHandler(err), null];
  //   }
  // }

  async CourseTransitions() {
    const { CourseTransitions } = this.server.models();

    const d = {
      id: 3,
      course_version_id: 6,
      // eslint-disable-next-line no-undef
      state: rachi,
      user_id: 7874,
    };

    try {
      // const volunteers = await Volunteer.query();
      const data = await CourseTransitions.query()
        .update({
          id: 3,
          course_version_id: d.course_version_id,
          state: d.state,
          user_id: d.user_id,
        })
        .where('id', 1);

      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  //   async CourseTransitions() {
  //     const { CourseTransitions } = this.server.models();
  //     try {
  //       // const volunteers = await Volunteer.query();
  //       const data = await CourseTransitions.query().delete().where('id', 1); // pass mannualy
  //       return [null, data];
  //     } catch (err) {
  //       return [errorHandler(err), null];
  //     }
  //   }

  //
};
