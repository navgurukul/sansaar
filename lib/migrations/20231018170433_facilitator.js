exports.up = async (knex) => {
    await knex.schema.createTable('main.facilitators', (table) => {
        table.increments().primary();
        table.string('name').notNullable();
        table.string('point_of_contact');
        table.string('email').notNullable();
        table.string('teacher_invite_link').notNullable();
        table.integer('partner_id').references('id').inTable('main.partners');
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.facilitators');
};