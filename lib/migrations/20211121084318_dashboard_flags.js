exports.up = async (knex) => {
    await knex.schema.createTable('main.dashboard_flags', (table) => {
    table.increments();
    table.integer('student_id').unsigned().references('id').inTable('main.students').notNullable();
    table.string('flag');
    table.datetime('createdAt');
  });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.dashboard_flags');
};
