const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');

module.exports = class UserRoleService extends Schmervice.Service {
  static calculate_engagement(d1, d2) {
    d1 = new Date(d1);
    d2 = new Date(d2);
    let months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    if (months <= 0) {
      return 0;
    }
    return months;
  }

  async getAllVolunteers() {
    const { UserRole, User, Classes } = this.server.models();
    const volunteers_data = {};

    try {
      // get user_ids from userRole
      const volunteer_ids = await UserRole.query()
        .select('user_id as id')
        .where('role', 'volunteer');

      volunteer_ids.forEach((volunteer_id, index) => {
        volunteer_ids[index] = volunteer_ids[index].id;
      });

      // query Users for name
      const volunteers = await User.query().select('name', 'id').whereIn('id', volunteer_ids);

      // get classes details
      const classes_data = await Promise.all(
        volunteers.map((volunteer) => {
          return Classes.query()
            .where('facilitator_id', volunteer.id)
            .orderBy('start_time', 'desc');
        })
      );

      volunteers.forEach((volunteer, i) => {
        const classes = classes_data[i];
        if (classes.length > 0) {
          const last_class = classes[0];
          const first_class = classes[classes.length - 1];
          volunteer.last_class_date = last_class.start_time;
          volunteer.last_class_title = last_class.title;
          volunteer.engagement_in_months = UserRoleService.calculate_engagement(
            first_class.start_time,
            last_class.start_time
          );
          volunteer.lang = last_class.lang;
        } else {
          volunteer.last_class_date = null;
          volunteer.last_class_title = null;
          volunteer.engagement_in_months = 0;
          volunteer.lang = null;
          volunteer.engagement_in_months = 0;
        }
      });

      volunteers_data.all_time_volunteer_signups = volunteer_ids.length;
      volunteers_data.volunteers = volunteers;
    } catch (err) {
      return [err, errorHandler(err)];
    }
    return [null, volunteers_data];
  }

  async getVolunteerById(id) {
    const { Classes, ClassRegistrations } = this.server.models();
    let volunteer_data = {};

    try {
      // get classes details
      const classes_data = await Classes.query().where('facilitator_id', id);

      if (classes_data.length > 0) {
        volunteer_data = {
          facilitator_id: classes_data[0].facilitator_id,
          facilitator_name: classes_data[0].facilitator_name,
          facilitator_email: classes_data[0].facilitator_email,
        };
      }

      // const ratings = classes_data.map((class) => {});
      const ratings = await Promise.all(
        classes_data.map((c) => {
          return ClassRegistrations.query()
            .select('feedback')
            .where('class_id', c.id)
            .whereNotNull('feedback');
        })
      );

      // filter classes data and get ratings
      ratings.forEach((c, i) => {
        c.forEach((r, j) => {
          ratings[i][j] = Number(r.feedback);
        });
        classes_data[i] = {
          id: classes_data[i].id,
          title: classes_data[i].title,
          start_time: classes_data[i].start_time,
          end_time: classes_data[i].end_time,
          lang: classes_data[i].lang,
          max_enrollment: classes_data[i].max_enrolment,
          avg_rating: Math.round(ratings.reduce((a, b) => a + b) / ratings.length),
        };
      });

      if (classes_data.length > 0) {
        volunteer_data.classes = classes_data;
      } else {
        volunteer_data.facilitator_id = id;
        volunteer_data.facilitator_name = null;
        volunteer_data.facilitator_email = null;
        volunteer_data.classes = [];
      }

      return [null, volunteer_data];
    } catch (err) {
      return [err, errorHandler(err)];
    }
  }
};
