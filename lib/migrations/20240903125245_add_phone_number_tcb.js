exports.up = async (knex) => {
    await knex.schema.alterTable('main.teacher_capacity_building', (table) => {
        table.string('phone_number');
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('main.teacher_capacity_building', (table) => {
        table.dropColumn('phone_number');
    });
};