const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
// eslint-disable-next-line no-undef
module.exports = class CourseStatesService extends Schmervice.Service {
  // eslint-disable-next-line consistent-return
  //   async CourseStates() {
  //     const { CourseStates } = this.server.models();
  //     // console.log("llll")

  //     try {
  //       const data = await CourseStates.query().insert({
  //         id: 1,
  //         state_id: 2,
  //         // eslint-disable-next-line no-undef
  //         state_name: kotputli,
  //       });
  //       return [null, data];
  //     } catch (err) {
  //       // eslint-disable-next-line no-undef
  //       return [errorHandler(err), null];
  //     }
  //   }
  //   async CourseStates() {
  //     const { CourseStates } = this.server.models();

  //     try {
  //       // const volunteers = await Volunteer.query();
  //       const data = await CourseStates.query().select().where('id', 1);
  //       console.log(data);
  //       return [null, data];
  //     } catch (err) {
  //       return [errorHandler(err), null];
  //     }
  // }

  async CourseStates() {
    const { CourseStates } = this.server.models();

    const d = {
      id: 3,
      // eslint-disable-next-line no-undef
      state_id: 9,
      // eslint-disable-next-line no-undef
      state_name: kot,
    };

    try {
      const data = await CourseStates.query()
        .update({
          id: 3,
          state_id: d.state_id,
          state_name: d.state_name,
        })
        .where('id', 1);

      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  //   async CourseStates() {
  //     const { CourseStates } = this.server.models();
  //     try {
  //       // const volunteers = await Volunteer.query();
  //       const data = await CourseStates.query().delete().where('id', 1); // pass mannualy
  //       return [null, data];
  //     } catch (err) {
  //       return [errorHandler(err), null];
  //     }
  //   }

  //
};
