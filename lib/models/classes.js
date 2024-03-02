const { Model } = require('objection');
const Joi = require('@hapi/joi');
const _ = require('lodash');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Classes extends ModelBase {
  static get tableName() {
    return 'main.classes';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      title: Joi.string(),
      sub_title: Joi.string(),
      description: Joi.string(),
      facilitator_id: Joi.number().integer().greater(0),
      volunteer_id: Joi.number().integer().greater(0).allow(null),
      facilitator_name: Joi.string().max(80),
      facilitator_email: Joi.string()
        .max(120)
        .pattern(
          // eslint-disable-next-line
          /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        ),
      start_time: Joi.date(),
      end_time: Joi.date(),
      category_id: Joi.number().integer(),
      course_version: Joi.string(),
      video_id: Joi.string(),
      lang: Joi.string().valid('hi', 'en', 'te', 'ta').lowercase(),
      type: Joi.string().valid('doubt_class', 'revision', 'batch'),
      meet_link: Joi.string()
        .length(12)
        .pattern(/\w{3}(-)\w{4}(-)\w{3}/),
      calendar_event_id: Joi.string(),
      material_link: Joi.string().uri(),
      max_enrolment: Joi.number().integer().greater(0),
      recurring_id: Joi.number().integer().optional(),
      partner_id: Joi.number().integer().optional(),
      space_id: Joi.number().integer().greater(0).allow(null),
    });
  }

  static afterFind({ result }) {
    const baseURL = 'https://meet.google.com/';
    _.map(result, (eachClass) => {
      if (eachClass.start_time)
        eachClass.start_time = `${eachClass.start_time.toISOString().replace('Z', '')}+05:30`;
      if (eachClass.end_time)
        eachClass.end_time = `${eachClass.end_time.toISOString().replace('Z', '')}+05:30`;
      if (eachClass.meet_link) eachClass.meet_link = baseURL + eachClass.meet_link;
      return eachClass;
    });
    return result;
  }

  static get relationMappings() {
    /* eslint-disable global-require */
    const CoursesV2 = require('./coursesV2');
    const User = require('./user');
    const ClassRegistrations = require('./classRegistrations');
    const RecurringClasses = require('./classesRecurring');
    const PathwayCoursesV2 = require('./pathwayCoursesV2');
    const ClassesToCourses = require('./classesToCourses');
    const Partner = require('./partner');
    const Volunteer = require('./volunteer');
    const MergedClasses = require('./mergedClasses');
    const PartnerSpecificBatches = require('./partnerSpecificBatches');


    /* eslint-enable global-require */
    return {
      classes_to_courses: {
        relation: Model.BelongsToOneRelation,
        modelClass: ClassesToCourses,
        join: {
          from: 'main.classes.id',
          to: 'main.classes_to_courses.class_id',
        },
      },

      merged_classes: {
        relation: Model.BelongsToOneRelation,
        modelClass: MergedClasses,
        join: {
          from: 'main.classes.id',
          to: 'main.merged_classes.merged_class_id',
        },
      },
      courses: {
        relation: Model.HasOneRelation,
        modelClass: CoursesV2,
        join: {
          from: 'main.classes.course_id',
          to: 'main.courses_v2.id',
        },
      },
      registrations: {
        relation: Model.HasManyRelation,
        modelClass: ClassRegistrations,
        join: {
          from: 'main.classes.id',
          to: 'main.class_registrations.class_id',
        },
      },
      facilitator: {
        relation: Model.HasOneRelation,
        modelClass: User,
        filter: (query) => query.select('name', 'email'),
        join: {
          from: 'main.classes.facilitator_id',
          to: 'main.users.id',
        },
      },
      feedbacks: {
        relation: Model.HasManyRelation,
        modelClass: ClassRegistrations,
        filter: (query) => query.select('feedback', 'feedback_at'),
        join: {
          from: 'main.classes.id',
          to: 'main.class_registrations.class_id',
        },
      },
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: 'main.classes.id',
          through: {
            modelClass: ClassRegistrations,
            from: 'main.class_registrations.class_id',
            to: 'main.class_registrations.user_id',
          },
          to: 'main.users.id',
        },
      },
      parent_class: {
        relation: Model.BelongsToOneRelation,
        modelClass: RecurringClasses,
        join: {
          from: 'main.classes.recurring_id',
          to: 'main.recurring_classes.id',
        },
      },
      pathways: {
        relation: Model.HasManyRelation,
        modelClass: PathwayCoursesV2,
        join: {
          from: 'main.classes.course_id',
          to: 'main.pathway_courses_v2.course_id',
        },
      },
      partner: {
        relation: Model.BelongsToOneRelation,
        modelClass: Partner,
        join: {
          from: 'main.classes.partner_id',
          to: 'main.partners.id',
        },
      },
      volunteer: {
        relation: Model.BelongsToOneRelation,
        modelClass: Volunteer,
        join: {
          from: 'main.classes.volunteer_id',
          to: 'main.volunteer.id',
        },
      },
      PartnerSpecificBatches: {
        relation: Model.BelongsToOneRelation,
        modelClass: PartnerSpecificBatches,
        join: {
          from: 'main.classes.recurring_id',
          to: 'main.partner_specific_batches.recurring_id',
        },
      },
    };
  }
};