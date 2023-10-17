const Schmervice = require('schmervice');
const JWT = require('jsonwebtoken');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const CONFIG = require('../config');
const {
    parseISOStringToDateObj,
    dateObjToYYYYMMDDFormat,
    convertToIST,
    UTCToISTConverter,
  } = require('../helpers/index');

module.exports = class batchesService extends Schmervice.Service {
    async getAllPartnerBatch( page, _limit, pathwayId, type_, user_id) {
        const {Classes, Volunteer, ClassRegistrations } = this.server.models();
        const { classesService } = this.server.services();

        try {
          const dateIST = UTCToISTConverter(new Date());
          let count__ = 0
          let recurringIds;
    
          if (type_ == 'batch') {
            recurringIds = await Classes.query()
            .select('classes.recurring_id', 'partner_specific_batches.partner_id')
            .innerJoin('main.partner_specific_batches', 'classes.recurring_id', 'partner_specific_batches.recurring_id')
            .where('partner_specific_batches.pathway_id', pathwayId)
            .andWhere('classes.start_time', '>', dateIST)
            .andWhere('classes.type', 'batch')
            .distinct('classes.recurring_id')
            .orderBy('classes.recurring_id', 'desc')
              .offset((page - 1) * _limit)
              .limit(_limit);
    
              if (true){
                const listOfBatches = await Classes.query()
                  .select('classes.recurring_id', 'partner_specific_batches.partner_id')
                  .innerJoin('main.partner_specific_batches', 'classes.recurring_id', 'partner_specific_batches.recurring_id')
                  .where('partner_specific_batches.pathway_id', pathwayId)
                  .andWhere('classes.start_time', '>', dateIST)
                  .andWhere('classes.type', 'batch')
                  .distinct('classes.recurring_id')
                  .orderBy('classes.recurring_id', 'desc')
                  count__ = listOfBatches.length
            }
            const totalData = await Promise.all(
              recurringIds.map(async ({ recurring_id }) => {  
                const firstClass = await Classes.query()
                    .select('id','title', 'start_time', 'recurring_id','volunteer_id',"meet_link",'calendar_event_id','type','lang','description','max_enrolment')
                    .where('recurring_id', recurring_id)
                    .orderBy('id')
                    .withGraphFetched({
                      registrations: true,
                      facilitator: true,
                      parent_class: true,
                      PartnerSpecificBatches: true
                    })
                    .modifyGraph('registrations', (builder) =>
                      builder.select('class_id', 'user_id', 'google_registration_status')
                    )
                    .first();
    
                  let name, email;
                  if(firstClass.volunteer_id !== null){
                    let VolunteerData = await Volunteer.query().select().where('id',firstClass.volunteer_id).withGraphFetched('user');
                    name = VolunteerData[0].user.name;
                    email = VolunteerData[0].user.email;
                  }
                const lastClass = await Classes.query()
                  .where('recurring_id', recurring_id)
                  .orderBy('start_time', 'desc')
                  .first();
                  let {start_time}=firstClass;
                  let enroled = await ClassRegistrations.query().select().where('class_id',firstClass.id).andWhere('user_id',user_id)
    
                  delete firstClass.start_time;
                  let [red, partnerIDs] = await classesService.getPartnerSpecificClass(null, firstClass.recurring_id)
    
                  return { ...firstClass,volunteer:{name,email},barch_start: start_time, batch_end: lastClass.start_time,partner_id:partnerIDs,enroled: enroled.length > 0 ? true : false };
                })
              );
            
              return [null,{total_count:count__, batches:totalData} ];
          } else {
            let newData = await Classes.query()
              .select('classes.id','classes.title', 'classes.type','partner_specific_batches.pathway_id' ,'partner_specific_batches.partner_id', 'classes.start_time', 'classes.end_time','classes.calendar_event_id','classes.meet_link','classes.lang','classes.description','classes.max_enrolment')
              .innerJoin('main.partner_specific_batches', 'classes.id', 'partner_specific_batches.class_id')
              .where('classes.start_time', '>', dateIST)
              .andWhere('classes.type', 'doubt_class')
              .orderBy('classes.id', 'desc')
              .offset((page - 1) * _limit)
              .limit(_limit);
            if (true){
              const listOfClasses = await Classes.query()
              .select('classes.id', 'partner_specific_batches.partner_id')
              .innerJoin('main.partner_specific_batches', 'classes.id', 'partner_specific_batches.class_id')
              .andWhere('classes.start_time', '>', dateIST)
              .andWhere('classes.type', 'doubt_class')
              .orderBy('classes.id', 'desc')
    
               count__ = listOfClasses.length
            }
            let dataTotal = await Promise.all(
             newData.map(async (data) => {
              let enroled = await ClassRegistrations.query().select().where('class_id',data.id).andWhere('user_id',user_id)
    
              let [red, partnerIDs] = await classesService.getPartnerSpecificClass(data.id,null)
              return {...data, partner_id:partnerIDs, enroled: enroled.length > 0 ? true : false}
              })
            )
            return [null,{total_count:count__, batches: dataTotal} ];
          }
          // Limit the number of returned rows
        } catch (error) {
          return [errorHandler(error), null];
        }
      }
    
      async getAllBatchClasses(reccuringId){
        const { Classes, MergedClasses } = this.server.models();
        const { classesService } = this.server.services();

        try{
          const mergedClasses = await MergedClasses.query().select('merged_class_id');
          const mergeClassIds = []
          if (mergedClasses !== null && mergedClasses !== undefined && mergedClasses.length > 0) {
            for (const c of mergedClasses) {
              mergeClassIds.push(c.merged_class_id)
            }
          }
          const classes = await Classes.query()
          .select('id','title', 'start_time','end_time', 'recurring_id',"meet_link",'calendar_event_id','type','lang','description','max_enrolment')
          .where('recurring_id',reccuringId)
          .whereNotIn('id', mergeClassIds)
            .withGraphFetched({
              registrations: true,
              facilitator: true,
              parent_class: true,
              PartnerSpecificBatches: true,
            })
            .modifyGraph('registrations', (builder) =>
              builder.select('class_id', 'user_id', 'google_registration_status')
            )
            let endGame = await Promise.all(
              classes.map(async (data) => {
                let [red, partnerIDs] = await classesService.getPartnerSpecificClass(null, data.recurring_id)
                return {...data, partner_id:partnerIDs}
              })
            )
    
            return [null, endGame];
        } catch (error) {
          return [errorHandler(error), null];
        }
      } 
}