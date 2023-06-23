exports.up = async (knex) => {
  await knex.schema.createTable('main.production_versions', (table) => {
    table.increments().primary();
    table.string('course_name');
    table.specificType('lang', 'char(2)').notNullable().defaultTo('en');
    table.string('version');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.production_versions');
};
