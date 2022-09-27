/* eslint-disable consistent-return */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
const Schmervice = require('schmervice');
const _ = require('lodash');
const { errorHandler } = require('../errorHandling');

module.exports = class UserRoleService extends Schmervice.Service {
  async getAllVolunteers() {
    /* eslint-disable no-unused-vars */
    const { UserRole, User, Volunteer } = this.server.models();
    let volunteers = [];
    // eslint-disable-next-line no-undef
    const l = [];
    let store;
    try {
      // get volunteer data and partner data
      const volunteersUserDetails = await UserRole.query()
        .select('user_id as id')
        .where('role', 'volunteer');
      for (const i of volunteersUserDetails) {
        l.push(i.id);
      }
      volunteers = await User.query()
        .whereIn('id', l)
        .withGraphFetched('[ partner,volunteer, classes.[pathways.pathway, feedbacks]]');
      // eslint-disable-next-line array-callback-return
      volunteers.map(async (v) => {
        // eslint-disable-next-line no-multi-assign
        if (v.volunteer.length > 0) {
          v.available_on_days = v.volunteer[0].available_on_days;
          v.available_on_time = v.volunteer[0].available_on_time;
          v.status = v.volunteer[0].status;
        } else {
          v.available_on_days = null;
          v.available_on_time = null;
          v.status = null;
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

  async setStatusInVolunteer() {
    const { UserRole, User, Volunteer } = this.server.models();
    let volunteers = [];
    // eslint-disable-next-line no-undef
    const l = [];
    try {
      // get volunteer data and partner data
      const volunteersUserDetails = await UserRole.query()
        .select('user_id as id')
        .where('role', 'volunteer');
      for (const i of volunteersUserDetails) {
        l.push(i.id);
      }
      volunteers = await User.query()
        .whereIn('id', l)
        .withGraphFetched('[ partner,volunteer, classes.[pathways.pathway, feedbacks]]');
      volunteers.map(async (v) => {
        if (v.classes.length <= 0) {
          const gap = new Date() - new Date(v.created_at);
          const gapInDays = Math.ceil(gap / (1000 * 60 * 60 * 24));
          if (gapInDays <= 30) {
            v.status = 'onboarding';
          } else if (gapInDays > 30 && gapInDays <= 180) {
            v.status = 'inactive';
          } else {
            v.status = 'dropout';
          }
        } else {
          const sortClass = _.sortBy(v.classes, 'start_time');
          const gap = new Date(sortClass[sortClass.length - 1].start_time) - new Date();
          const gapInDays = Math.ceil(gap / (1000 * 60 * 60 * 24));
          if (new Date(sortClass[sortClass.length - 1].start_time) > new Date()) {
            v.status = 'active';
          } else if (
            new Date(sortClass[sortClass.length - 1].start_time) <= new Date() &&
            gapInDays <= 180
          ) {
            v.status = 'inactive';
          } else {
            v.status = 'dropout';
          }
        }
        const dd = await Volunteer.query()
          .patch({
            status: v.status,
          })
          .where({ user_id: v.id });
      });
      return;
    } catch (err) {
      return err;
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

  async updatevolunteer(Payloadreceiver, paramsid) {
    try {
      const { Volunteer } = this.server.models();
      await Volunteer.query()
        .patch({
          status: Payloadreceiver.status,
        })
        .where({ user_id: paramsid.userID });
      return [null, 'successfully updated'];
      // }
    } catch (err) {
      console.log(err);
      return [err, null];
    }
  }
};
