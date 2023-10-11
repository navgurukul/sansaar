exports.up = async (knex) => {
    await knex.schema.alterTable('main.partners', (table) => {
        table.string('phone_number');
    });
};
    
exports.down = async (knex) => {
    await knex.schema.alterTable('main.partners', (table) => {
        table.dropColumn('phone_number');
    });
};