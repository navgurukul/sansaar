const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
// eslint-disable-next-line no-undef
module.exports = class CourseVersionsService extends Schmervice.Service {
  //   async postCourseVersions() {
  //     const { CourseVersions } = this.server.models();
  //     // console.log("llll")
  //     try {
  //       const data = await CourseVersions.query().insert({
  //         course_id: 1,
  //         // eslint-disable-next-line no-undef
  //         version: 'v10',
  //       });
  //       return [null, data];
  //     } catch (err) {
  //       console.log(err);
  //       // eslint-disable-next-line no-undef
  //       return [errorHandler(err), null];
  //     }
  //   }
  // async postCourseVersions() {
  //   const { CourseVersions } = this.server.models();
  //   try {
  //     // const volunteers = await Volunteer.query();
  //     const data = await CourseVersions.query().select().where('course_id', 1);
  //     console.log(data);
  //     return [null, data];
  //   } catch (err) {
  //     return [errorHandler(err), null];
  //   }
  // }
  // async postCourseVersions() {
  //   const { CourseVersions } = this.server.models();
  //   const d = {
  //     course_id: 2,
  //     version: 'v5',
  //   };
  //   try {
  //     // const volunteers = await Volunteer.query();
  //     const data = await CourseVersions.query()
  //       .update({
  //         course_id: d.course_id,
  //         version: d.version,
  //       })
  //       .where('id', 1);
  //     return [null, data];
  //   } catch (err) {
  //     return [errorHandler(err), null];
  //   }
  // }
  async postCourseVersions() {
    const { CourseVersions } = this.server.models();
    try {
      // const volunteers = await Volunteer.query();
      const data = await CourseVersions.query().delete().where('id', 1); // pass mannualy
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
  //
};
