exports.up = async (knex) => {
    await knex.schema.alterTable('main.teacher_capacity_building', (table) => {
        table.string('employee_type');
        table.timestamp('created_at');
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('main.teacher_capacity_building', (table) => {
        table.dropColumn('employee_type');
        table.dropColumn('created_at');
    });
};