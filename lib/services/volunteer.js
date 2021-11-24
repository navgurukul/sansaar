const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');

module.exports = class UserRoleService extends Schmervice.Service {
  async getAllVolunteers() {
    const { UserRole, Classes } = this.server.models();
    let volunteers = [];

    try {
      // get volunteer data and partner data
      volunteers = await UserRole.query()
        .select('user_id as id')
        .where('role', 'volunteer')
        .withGraphFetched('user.[partner]');

      volunteers.forEach((v, index) => {
        volunteers[index] = { volunteer_data: volunteers[index].user };
      });

      // get classes and ratings data
      const classes_data = await Promise.all(
        volunteers.map((volunteer) => {
          return Classes.query()
            .where('facilitator_id', volunteer.volunteer_data.id)
            .withGraphFetched('registrations');
        })
      );

      volunteers.forEach((v, i) => {
        volunteers[i].classes = classes_data[i];
      });

      // filtering data
      const res = volunteers.map((v) => {
        return {
          volunteer_data: {
            id: v.volunteer_data.id,
            name: v.volunteer_data.name,
            email: v.volunteer_data.email,
            partner_id: v.volunteer_data.partner_id,
            partner: v.volunteer_data.partner,
          },
          classes: v.classes.map((cl) => {
            return {
              id: cl.id,
              title: cl.title,
              description: cl.description,
              start_time: cl.start_time,
              end_time: cl.end_time,
              lang: cl.lang,
              max_enrollment: cl.max_enrolment,
              recurring_id: cl.recurring_id,
              ratings: cl.registrations.map((r) => {
                return {
                  rating: r.feedback,
                };
              }),
            };
          }),
        };
      });

      return [null, res];
    } catch (err) {
      return [err, errorHandler(err)];
    }
  }
};
