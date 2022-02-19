exports.seed = async function (knex) {
  return knex('main.classes')
    .select('*')
    .then(async (data) => {
      for (var i of data) {
        knex('main.classes').update('version', 'v1').where('id', i.id);
      }
      // await knex('main.classes').update('version', 'v1').where('id', 295);
    });
};
