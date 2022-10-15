/* eslint-disable consistent-return */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
const Schmervice = require('schmervice');
const _ = require('lodash');
const { errorHandler } = require('../errorHandling');

module.exports = class UserRoleService extends Schmervice.Service {
  async getAllVolunteers(createdTime, createTime2, volunteerStatus, name, lang) {
    /* eslint-disable no-unused-vars */
    const { UserRole, User, Volunteer } = this.server.models();
    let volunteers = [];
    // eslint-disable-next-line no-undef
    const [l, timel] = [[], []];
    let store;
    try {
      // get volunteer data and partner data
      let volunteersUserDetails = await UserRole.query()
        .select('user_id as id')
        .where('role', 'volunteer');

      if (createdTime !== undefined && createTime2 !== undefined) {
        volunteersUserDetails = await UserRole.query()
          .select('user_id as id')
          .where('role', 'volunteer')
          .where('created_at', '>', createdTime)
          .where('created_at', '<=', createTime2);
      }
      for (const i of volunteersUserDetails) {
        l.push(i.id);
      }
      volunteers = await User.query()
        .whereIn('id', l)
        .withGraphFetched('[ partner,volunteer, classes.[pathways.pathway, feedbacks]]');
      // eslint-disable-next-line array-callback-return
      // Add filter for name
      if (name !== undefined) {
        volunteers = volunteers.filter((v) => {
          return v.name.toLowerCase().includes(name.toLowerCase())
        })
      }

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
      let filtered_res;
      let filt;
      filtered_res = volunteers.filter((v) => v.classes.length > 0)
      if (lang !== undefined) {
        filt = filtered_res.filter((el) => el.classes[el.classes.length - 1]['lang'] === lang);
        filtered_res = filt;
      }
      

      // filtering data
      let res = filtered_res.map((v) => {
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
      const [list_null, list_active, list_inactive, list_dropout, list_onboarding] = [
        [],
        [],
        [],
        [],
        [],
      ];
      if (volunteerStatus !== undefined) {
        for (const volunteerdata of res) {
          if (volunteerdata.status === null) {
            list_null.push(volunteerdata);
          } else if (volunteerdata.status === 'active') {
            list_active.push(volunteerdata);
          } else if (volunteerdata.status === 'inactive') {
            list_inactive.push(volunteerdata);
          } else if (volunteerdata.status === 'inactive') {
            list_dropout.push(volunteerdata);
          } else if (volunteerdata.status === 'list_onboarding') {
            list_onboarding.push();
          }
        }
      }
      if (volunteerStatus === 'inactive') {
        res = list_inactive;
      } else if (volunteerStatus === 'active') {
        res = list_active;
      } else if (volunteerStatus === 'null') {
        res = list_null;
      } else if (volunteerStatus === 'dropout') {
        res = list_dropout;
      } else if (volunteerStatus === 'onboarding') {
        res = list_onboarding;
      }

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

  async deleteVolunteer(volunteer_IDS) {
    try {
      const { Volunteer, UserRole } = this.server.models();
      let removeVolunteerRoles;
      // eslint-disable-next-line no-plusplus
      for (let item = 0; item < volunteer_IDS.length; item++) {
        removeVolunteerRoles = await UserRole.query()
          .delete()
          .where({ user_id: volunteer_IDS[item] })
          .andWhere('role', 'volunteer');
        const l = [];
        const volunteerUserId = await Volunteer.query().select('user_id as id');
        for (const i of volunteerUserId) {
          if (!l.includes(i.id)) {
            l.push(i.id);
          }
        }
        if (l.includes(volunteer_IDS[item])) {
          await Volunteer.query().delete().where({ user_id: volunteer_IDS[item] });
        }
      }
      return [null, removeVolunteerRoles];
    } catch (err) {
      console.log(err);
      return [err, null];
    }
  }
};
