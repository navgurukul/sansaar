/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
const { stat } = require('fs-extra');
const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');
const users = require('../routes/users');

const d = new Date();

module.exports = class UserRoleService extends Schmervice.Service {
  async getAllVolunteers() {
    /* eslint-disable no-unused-vars */
    const { UserRole, User } = this.server.models();
    let volunteers = [];
    // eslint-disable-next-line no-undef
    const l = [29340];
    let store;
    try {
      // get volunteer data and partner data
      const volunteersUserDetails = await UserRole.query()
        .select('user_id as id')
        .where('role', 'volunteer');
      for (const i of volunteersUserDetails) {
        l.push(i.id);
        // l1.push(i.created_at)
      }
      volunteers = await User.query()
        .whereIn('id', l)
        .withGraphFetched('[ partner,volunteer, classes.[pathways.pathway, feedbacks]]');
      // eslint-disable-next-line array-callback-return
      volunteers.map((v) => {
        const gap = new Date() - new Date(v.created_at);
        const gapInDays = Math.ceil(gap / (1000 * 60 * 60 * 24));
        const status = gapInDays > 180 ? 'inactive' : 'active';
        v.status = status;
        // eslint-disable-next-line no-multi-assign
        if (v.volunteer.length > 0) {
          v.available_on_days = v.volunteer[0].available_on_days;
          v.available_on_time = v.volunteer[0].available_on_time;
        } else {
          v.available_on_days = null;
          v.available_on_time = null;
        }
        delete v.volunteer;
        return { ...v, classes: v.classes };
      });
      // filter out volunteers with no classes
      const filtered_res = volunteers.filter((v) => v.classes.length > 0);

      // filtering data
      const res = filtered_res.map((v) => {
        const pathways = [];
        const pathways_data = v.classes.map((cl) => cl.pathways.map((p) => p.pathway.name));
        pathways_data.forEach((p) => {
          p.forEach((s) => {
            pathways.push(s);
          });
        });
        const uniq_pathways = [...new Set(pathways)];
        return {
          id: v.id,
          name: v.name,
          email: v.email,
          partner_id: v.partner_id,
          partner: v.partner ? v.partner.name : '',
          pathways: uniq_pathways,
          contact: v.contact,
          available_on_days: v.available_on_days,
          available_on_time: v.available_on_time,
          status: v.status,
          classes: v.classes.map((cl) => {
            return {
              id: cl.id,
              title: cl.title,
              start_time: cl.start_time,
              end_time: cl.end_time,
              lang: cl.lang,
              ratings: cl.feedbacks.map((r) => ({ rating: r.feedback })),
            };
          }),
        };
      });
      return [null, res];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async createVolunteer(details) {
    const { Volunteer } = this.server.models();
    try {
      const volunteer = await Volunteer.query()
        .where('user_id', details.user_id)
        .andWhere('pathway_id', details.pathway_id);
      if (volunteer.length <= 0) {
        await Volunteer.query().insert(details);
      }
      return [null, volunteer];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async volunteerUser(user_id) {
    const { Volunteer } = this.server.models();
    const volunteer = await Volunteer.query().where('user_id', user_id);
    return volunteer;
  }
};
