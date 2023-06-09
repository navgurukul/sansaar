const Strapi = require('strapi-sdk-js');

const strapi = new Strapi({
  url: process.env.STRAPI_URL,
});

// eslint-disable-next-line func-names, consistent-return
exports.seed = async function (knex) {
  try {
    let strapiExer = [];
    let start = 0;
    const limit = 100;
    const total = 1352; // how much data you want from strapi database
    const startTime = Date.now();
    while (strapiExer.length < total) {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await strapi.find('exercises', {
        sort: 'createdAt:asc',
        pagination: { start, limit },
      });
      strapiExer = strapiExer.concat(data);
      start += limit;
    }
    // all assessments from sansaar
    const sansaarAssess = await knex('learning_track_status')
      .join('exercises_v2', 'exercises_v2.id', 'learning_track_status.exercise_id')
      .select('learning_track_status.*', 'exercises_v2.id', 'exercises_v2.name');

    // eslint-disable-next-line no-restricted-syntax
    for (const sansaar of sansaarAssess) {
      const name1 = sansaar.name;
      const strapiMatch = strapiExer.find((assess) => assess.attributes.name === name1);

      if (strapiMatch) {
        const obj = {
          user_id: sansaar.user_id,
          exercise_id: strapiMatch.id,
          course_id: sansaar.course_id,
          pathway_id: sansaar.pathway_id,
        };
        // console.log(obj);
        // eslint-disable-next-line no-await-in-loop
        await knex('learning_track_status_outcome').insert(obj);
      }
    }
    const endTime = Date.now();
    console.log(endTime - startTime, '- time taken in millisec');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return error;
  }
};
