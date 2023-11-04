/* eslint-disable prettier/prettier */
// eslint-disable-next-line
exports.seed = async function (knex) {
  return (
    knex('main.classes')
      .select('*')
      // eslint-disable-next-line
      .then(async (data) => {
        // eslint-disable-next-line
        for (let i of data) {
          // eslint-disable-next-line
          await knex('main.classes').update('course_version', 'v1').where('id', i.id);
        }
      })
  );
};
