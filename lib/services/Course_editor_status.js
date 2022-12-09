// eslint-disable no-dupe-class-members */
/* eslint-disable consistent-return */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');

module.exports = class CourseEditorService extends Schmervice.Service {
  async postcourseEditor() {
    const { CourseEditor } = this.server.models();

    try {
      console.log('inside');
      // const volunteers = await Volunteer.query();
      const data = await CourseEditor.query().insert({
        course_id: 1,
        course_states: 'english',
        content_editors_user_id: 'll',
      });
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async GetcourseEditor() {
    const { CourseEditor } = this.server.models();

    try {
      console.log('inside');
      const data = await CourseEditor.query().select().where('course_id', 1);
      console.log(data);
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async update_courseEditor() {
    const { CourseEditor } = this.server.models();

    const d = {
      course_id: 2,
      course_states: 'Hindi',
      stateChangedate: 'null',
      content_editors_user_id: 'llllllllll',
    };

    try {
      const data = await CourseEditor.query()
        .update({
          course_id: d.course_id,
          course_states: d.course_states,
          content_editors_user_id: d.content_editors_user_id,
        })
        .where('id', 1);

      console.log(data);
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async delete_courseEditor() {
    const { CourseEditor } = this.server.models();
    try {
      const data = await CourseEditor.query().delete().where('id', 1); // pass mannualy
      console.log(data);
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
