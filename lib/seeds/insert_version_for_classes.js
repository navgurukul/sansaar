exports.seed = async function (knex) {
  return knex('main.classes')
    .select('*')
    .then(async (data) => {
      for (let i of data) {
        await knex('main.classes').update('course_version', 'v1').where('id', i.id);
      }
    });
};
