exports.up = async (knex) => {
    await knex.schema.alterTable('main.students', (table) => {
        table.string('campus_status');
    });
};
    
exports.down = async (knex) => {
    await knex.schema.alterTable('main.students', (table) => {
        table.dropColumn('campus_status');
    });
};