const Schmervice = require('schmervice');
const JWT = require('jsonwebtoken');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const CONFIG = require('../config');
const { UTCToISTConverter } = require('../helpers/index');

module.exports = class batchesService extends Schmervice.Service {
  async getAllPartnerBatch(page, _limit, pathwayId, type_, user_id, dateIST = UTCToISTConverter(new Date())) {
    const { Classes, Volunteer, ClassRegistrations } = this.server.models();
    const { classesService } = this.server.services();

    try {
      let count__ = 0;
      let recurringIds;

      if (type_ == 'batch') {
        recurringIds = await Classes.query()
          .select('classes.recurring_id', 'partner_specific_batches.partner_id')
          .innerJoin(
            'main.partner_specific_batches',
            'classes.recurring_id',
            'partner_specific_batches.recurring_id'
          )
          .where('partner_specific_batches.pathway_id', pathwayId)
          .andWhere('classes.start_time', '>', dateIST)
          .andWhere('classes.type', 'batch')
          .distinct('classes.recurring_id')
          .orderBy('classes.recurring_id', 'desc')
          .offset((page - 1) * _limit)
          .limit(_limit);

        if (true) {
          const listOfBatches = await Classes.query()
            .select('classes.recurring_id', 'partner_specific_batches.partner_id')
            .innerJoin(
              'main.partner_specific_batches',
              'classes.recurring_id',
              'partner_specific_batches.recurring_id'
            )
            .where('partner_specific_batches.pathway_id', pathwayId)
            .andWhere('classes.start_time', '>', dateIST)
            .andWhere('classes.type', 'batch')
            .distinct('classes.recurring_id')
            .orderBy('classes.recurring_id', 'desc');
          count__ = listOfBatches.length;
        }
        const totalData = await Promise.all(
          recurringIds.map(async ({ recurring_id }) => {
            const firstClass = await Classes.query()
              .select(
                'id',
                'title',
                'start_time',
                'recurring_id',
                'volunteer_id',
                'meet_link',
                'calendar_event_id',
                'type',
                'lang',
                'description',
                'max_enrolment'
              )
              .where('recurring_id', recurring_id)
              .orderBy('id')
              .withGraphFetched({
                registrations: true,
                facilitator: true,
                parent_class: true,
                PartnerSpecificBatches: true,
              })
              .modifyGraph('registrations', (builder) =>
                builder.select('class_id', 'user_id', 'google_registration_status')
              )
              .first();

            let name, email;
            if (firstClass.volunteer_id !== null) {
              let VolunteerData = await Volunteer.query()
                .select()
                .where('id', firstClass.volunteer_id)
                .withGraphFetched('user');
              name = VolunteerData[0].user.name;
              email = VolunteerData[0].user.email;
            }
            const lastClass = await Classes.query()
              .where('recurring_id', recurring_id)
              .orderBy('start_time', 'desc')
              .first();
            let { start_time } = firstClass;
            let enroled = await ClassRegistrations.query()
              .select()
              .where('class_id', firstClass.id)
              .andWhere('user_id', user_id);

            delete firstClass.start_time;
            let red = null;
            let partnerIDs = null;
            if (firstClass.recurring_id){
              [red, partnerIDs] = await classesService.getPartnerSpecificClass(
                null,
                firstClass.recurring_id
              );
            } else{
              [red, partnerIDs] = await classesService.getPartnerSpecificClass(
                firstClass.id,
                null
              );
            }

            return {
              ...firstClass,
              volunteer: { name, email },
              batch_start: start_time,
              batch_end: lastClass.start_time,
              partner_id: partnerIDs,
              enroled: enroled.length > 0 ? true : false,
            };
          })
        );

        return [null, { total_count: count__, batches: totalData }];
      } else {
        let newData = await Classes.query()
          .select(
            'classes.id',
            'classes.title',
            'classes.type',
            'partner_specific_batches.pathway_id',
            'partner_specific_batches.partner_id',
            'classes.start_time',
            'classes.end_time',
            'classes.calendar_event_id',
            'classes.meet_link',
            'classes.lang',
            'classes.description',
            'classes.max_enrolment'
          )
          .innerJoin(
            'main.partner_specific_batches',
            'classes.id',
            'partner_specific_batches.class_id'
          )
          .where('classes.start_time', '>', dateIST)
          .andWhere('classes.type', 'doubt_class')
          .orderBy('classes.id', 'desc')
          .withGraphFetched({
            facilitator: true,
          })
          .modifyGraph('registrations', (builder) =>
            builder.select('class_id', 'user_id', 'google_registration_status')
          )
          .offset((page - 1) * _limit)
          .limit(_limit);
        if (true) {
          const listOfClasses = await Classes.query()
            .select('classes.id', 'partner_specific_batches.partner_id')
            .innerJoin(
              'main.partner_specific_batches',
              'classes.id',
              'partner_specific_batches.class_id'
            )
            .andWhere('classes.start_time', '>', dateIST)
            .andWhere('classes.type', 'doubt_class')
            .orderBy('classes.id', 'desc');

          count__ = listOfClasses.length;
        }
        let dataTotal = await Promise.all(
          newData.map(async (data) => {
            let enroled = await ClassRegistrations.query()
              .select()
              .where('class_id', data.id)
              .andWhere('user_id', user_id);

            let [red, partnerIDs] = await classesService.getPartnerSpecificClass(data.id, null);
            return { ...data, partner_id: partnerIDs, enroled: enroled.length > 0 ? true : false };
          })
        );
        logger.info('Gets a list of all upcoming, ongoing batches and doubt_classes with pagination. dataTotal:', dataTotal);
        return [null, { total_count: count__, batches: dataTotal }];
      }
    } catch (error) {
      return [errorHandler(error), null];
    }
  }

  async getAllBatchClasses(reccuringId) {
    const { Classes, MergedClasses } = this.server.models();
    const { classesService } = this.server.services();

    try {
      const mergedClasses = await MergedClasses.query().select('merged_class_id');
      const mergeClassIds = [];
      if (mergedClasses !== null && mergedClasses !== undefined && mergedClasses.length > 0) {
        for (const c of mergedClasses) {
          mergeClassIds.push(c.merged_class_id);
        }
      }
      const classes = await Classes.query()
        .select('*')
        .where('recurring_id', reccuringId)
        .whereNotIn('id', mergeClassIds)
        .orderBy('id')
        .withGraphFetched({
          registrations: true,
          facilitator: true,
          parent_class: true,
          PartnerSpecificBatches: true,
        })
        .modifyGraph('registrations', (builder) =>
          builder.select('class_id', 'user_id', 'google_registration_status')
        );
      let endGame = await Promise.all(
        classes.map(async (data) => {
          let [red, partnerIDs] = await classesService.getPartnerSpecificClass(
            null,
            data.recurring_id
          );
          return { ...data, partner_id: partnerIDs };
        })
      );

      return [null, endGame];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }

  // this function will give the all batches of the user erolled classes
  async userEnrolmentInBatch(userId) {
    try {
      const { Classes } = this.server.models();
      const { pathwayServiceV2 } = this.server.services();
      let [err,pathway_names] = await pathwayServiceV2.pathwaysNames()
      if (err){
        return [err,null]
      }
      const classes = await Classes.query()
      .select('id', 'title', 'start_time', 'end_time', 'recurring_id', 'facilitator_id', 'facilitator_name', 'meet_link', 'video_id', 'type', 'category_id', 'lang', 'description')
      .andWhere('classes.type', 'batch')
      .withGraphFetched('registrations')
      .withGraphFetched('facilitator')
      .withGraphFetched('classes_to_courses')
      .modifyGraph('registrations', (builder) => {
        builder.where('user_id', userId);
      });
    
      const flattenedResponse = [];
      const recurring_ids = [];

      classes.filter(item => {
        delete item.facilitator.email
        const registration = item.registrations.filter(item => item.user_id == userId);;

        if (!recurring_ids.includes(item.recurring_id) && registration.length > 0){
          const classes_to_courses = item.classes_to_courses;
          let pathwayId_ = classes_to_courses.pathway_v1 || classes_to_courses.pathway_v2 || classes_to_courses.pathway_v3;
          let pathway = pathway_names.filter(item => item.id == pathwayId_);
          let pathway_name;
          
          if (pathway.length > 0){
            pathway_name= pathway[0].name
            recurring_ids.push(item.recurring_id);
            flattenedResponse.push({
              id: item.id,
              title: item.title,
              start_time: item.start_time,
              end_time: item.end_time,
              recurring_id: item.recurring_id,
              meet_link: item.meet_link,
              type: item.type,
              lang: item.lang,
              description: item.description,
              video_id: item.video_id,
              category_id: item.category_id,
              course_id:  classes_to_courses.course_v1 || classes_to_courses.course_v2 || classes_to_courses.course_v3,
              exercise_id: classes_to_courses.exercise_v1 || classes_to_courses.exercise_v2 || classes_to_courses.exercise_v3,
              enrolled: true,
              pathway_name,
              facilitator_id: item.facilitator_id,
              facilitator:item.facilitator,
              rules: {
                en: `## Rules\n- Join the class atleast\n10 minutes before schedule.\n\n- Watch [this video](https://www.youtube.com/watch?v=QfBnS1Gnw2c) if you are new to\nMeraki, to follow the instructions.`,
              }
            });
          }
        }
      });
      // console.log(flattenedResponse);
      return [null, flattenedResponse];
    } catch (error) {
      console.log(error,'Error in userEnrolmentInBatch');
    return [errorHandler(error), null];
  }
  }
};
