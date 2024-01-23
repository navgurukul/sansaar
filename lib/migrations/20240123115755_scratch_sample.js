exports.up = async (knex) => {
    await knex.schema.createTable('main.scratch_sample', (t) => {
        t.increments('id').primary();
        t.string('project_id').notNullable();
        t.string('url').notNullable();
        t.string('project_name');
        t.date('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.scratch_sample');
};