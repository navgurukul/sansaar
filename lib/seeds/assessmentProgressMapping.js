const Strapi = require('strapi-sdk-js');

const strapi = new Strapi({
  // url: process.env.STRAPI_URL,
  url: 'http://3.110.213.190/api',
});

console.log(process.env.STRAPI_URL);
exports.seed = async function (knex) {
  try {
    const assessmentsOutcomes = await knex('main.assessment_outcome').select('*');
    const count = 0;
    for (const assessmentOutcome of assessmentsOutcomes) {
      const { data } = await strapi.findOne('assessments', assessmentOutcome.assessment_id, {
        populate: ['course', 'exercise', 'slug'],
      });
      const slug_id = data.attributes.slug.data.id;
      const course_id = data.attributes.course.data.id;
      const selected_option = assessmentOutcome.selected_option ? `[${assessmentOutcome.selected_option}]` : assessmentOutcome.selected_multiple_option;
      const lang = data.attributes.locale;
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
      console.log('Data Inserted Successfully...', assessmentOutcome.assessment_id);
    }
  } catch (error) {
    console.log(error);
  }
};
