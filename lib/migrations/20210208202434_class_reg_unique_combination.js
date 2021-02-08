const { knexSnakeCaseMappers } = require('objection');

exports.up = async (knex) => {
  await knex.schema.alterTable('main.class_registration', (table) => {
    table.unique('user_id', 'class_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.class_registration', (table) => {
    table.dropUnique('user_id', 'class_id');
  });
};
