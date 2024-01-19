const Strapi = require('strapi-sdk-js');

const strapi = new Strapi({
  // url: process.env.STRAPI_URL,
  url: 'http://3.110.213.190/api',
});

console.log(process.env.STRAPI_URL);
exports.seed = async function (knex) {
  try {
    const assessmentsOutcomes = await knex('main.assessment_outcome').select('*');
    // console.log(assessmentsOutcomes[0], 'assessmentsOutcomes');
    let count = 0;
    const failed = [];
    for (const assessmentOutcome of assessmentsOutcomes) {
      console.log('assessment_id------>', assessmentOutcome.assessment_id);
      let data;
      try {
        data = await strapi.findOne('assessments', assessmentOutcome.assessment_id, {
          populate: ['course', 'exercise', 'slug'],
        });
      } catch (error) {
        console.log(error, 'error');
        failed.push(assessmentOutcome.assessment_id);
        continue;
      }
      const slug_id = data.data.attributes.slug.data.id;
      const course_id = data.data.attributes.course.data.id;
      const selected_option = assessmentOutcome.selected_option ? `[${assessmentOutcome.selected_option}]` : assessmentOutcome.selected_multiple_option;
      const lang = data.data.attributes.locale;
      const InsertResponse = {
        "slug_id": slug_id,
        "selected_option": selected_option,
        "status": assessmentOutcome.status,
        "attempt_count": assessmentOutcome.attempt_count,
        "course_id": course_id,
        "user_id": assessmentOutcome?.user_id,
        "team_id": assessmentOutcome?.team_id,
        "lang": lang,
      }
      const checkExists = assessmentOutcome.user_id ? { slug_id, user_id: assessmentOutcome.user_id } : { slug_id, team_id: assessmentOutcome.team_id };
      const checkResponse = await knex('main.assessments_history').where(checkExists).select('*');
      if (checkResponse.length) continue;
      console.log(InsertResponse);
      await knex('main.assessments_history').insert(InsertResponse);
      count++;
      console.log(count, 'count');
    }
    console.log('successFully inserted', count);
    console.log('total assessments', assessmentsOutcomes.length);
    console.log('failed', failed);
  } catch (error) {
    console.log(error, 'error');
  }
};
