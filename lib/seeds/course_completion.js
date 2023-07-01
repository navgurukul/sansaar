// eslint-disable-next-line func-names, consistent-return
exports.seed = async function (knex) {
  try {
    const startTime = Date.now();

    // all assessments from sansaar
    const v2Completion = await knex('main.course_completion_v2');
    // eslint-disable-next-line no-restricted-syntax
    for (const item of v2Completion) {
      // eslint-disable-next-line no-await-in-loop
      await knex('main.course_completion_v3').insert(item);
    }
    const endTime = Date.now();
    // eslint-disable-next-line no-console
    console.log(endTime - startTime, '- time taken in millisec');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return error;
  }
};
