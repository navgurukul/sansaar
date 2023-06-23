/* eslint-disable prettier/prettier */
const Strapi = require('strapi-sdk-js');

const strapi = new Strapi({
  url: process.env.STRAPI_URL,
});

// eslint-disable-next-line func-names, consistent-return
exports.seed = async function (knex) {
  try {
    let strapiAssess = [];
    let start = 0;
    const limit = 100;
    const total = 290; // how much data you want from strapi database

    while (strapiAssess.length < total) {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await strapi.find('assessments', {
        sort: 'createdAt:asc',
        pagination: { start, limit },
      });
      strapiAssess = strapiAssess.concat(data);
      start += limit;
    }
    // all assessments from sansaar
    const sansaarAssess = await knex('assessment_result')
      .join('assessment', 'assessment.id', 'assessment_result.assessment_id')
      .select('assessment_result.*', 'assessment.name');

    // eslint-disable-next-line no-restricted-syntax
    for (const sansaar of sansaarAssess) {
      const name1 = sansaar.name;
      const strapiMatch = strapiAssess.find((assess) => assess.attributes.name === name1);

      if (strapiMatch) {
        const obj = {
          user_id: sansaar.user_id,
          assessment_id: strapiMatch.id,
          status: sansaar.status,
          selected_option: sansaar.selected_option,
          attempt_count: sansaar.attempt_count,
        };
        // eslint-disable-next-line no-await-in-loop
        await knex('assessment_outcome').insert(obj);
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return error;
  }
};
