const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');

module.exports = class UserRoleService extends Schmervice.Service {
  async getAllVolunteers(query) {
    const { UserRole, Classes } = this.server.models();

    let volunteers = [];
    const { limit, page, name } = query;
    const offset = (page - 1) * limit;

    try {
      // get volunteer data and partner data
      if (name) {
        volunteers = (
          await UserRole.query()
            .select('user_id as id')
            .where('role', 'volunteer')
            .withGraphFetched('user.[partner]')
            .modifyGraph('user', (builder) => {
              builder.whereRaw('LOWER(name) LIKE ?', [`%${name.trim().toLowerCase()}%`]);
            })
        )
          .map((v) => v.user)
          .filter((v) => v != null);
      } else {
        volunteers = (
          await UserRole.query()
            .select('user_id as id')
            .where('role', 'volunteer')
            .limit(limit)
            .offset(offset)
            .withGraphFetched('user.[partner]')
        ).map((v) => v.user);
      }

      // get classes and ratings data
      const classes_data = await Promise.all(
        volunteers.map((volunteer) => {
          return Classes.query()
            .where('facilitator_id', volunteer.id)
            .orWhere('facilitator_email', volunteer.email)
            .withGraphFetched('[pathways.pathway, feedbacks]');
        })
      );

      volunteers.forEach((v, i) => {
        v.classes = classes_data[i];
      });

      // filtering data
      const res = volunteers.map((v) => {
        // filter pathways
        const pathways = [];
        const pathways_data = v.classes.map((cl) => {
          return cl.pathways.map((p) => {
            return p.pathway.name;
          });
        });
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
};
