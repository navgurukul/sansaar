exports.up = async (knex) => {
  await knex.schema.alterTable('main.courses', (table) => {
    table.enu('course_type', ['html', 'js', 'python', 'typing']);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.courses', (table) => {
    table.enu('course_type', ['html', 'js', 'python']);
  });
};
