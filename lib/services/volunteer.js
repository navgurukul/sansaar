const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');

module.exports = class UserRoleService extends Schmervice.Service {
  async getAllVolunteers() {
    /* eslint-disable no-unused-vars */
    const { UserRole, Classes } = this.server.models();
    let volunteers = [];

    try {
      // get volunteer data and partner data
      volunteers = (
        await UserRole.query()
          .select('user_id as id')
          .where('role', 'volunteer')
          .withGraphFetched('[user.[partner], classes.[pathways.pathway, feedbacks]]')
      ).map((v) => {
        return { ...v.user, classes: v.classes };
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

  async volunteerWorking(data, user_id) {
    const { Volunteer } = this.server.models();
    const volunteer_data = await Volunteer.query().where('user_id', user_id);
    let id;
    let pathway_id;
    // eslint-disable-next-line no-restricted-syntax
    for (const details_of_volunteer of volunteer_data) {
      id = details_of_volunteer.id;
      pathway_id = details_of_volunteer.pathway_id;
    }
    try {
      const { hours_per_week } = data;
      const available_on_days = data.available_on_days.join();
      const { available_on_time } = data;
      await Volunteer.query()
        .where({ user_id })
        .update({ id, pathway_id, user_id, hours_per_week, available_on_days, available_on_time });
      return 'updated';
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
