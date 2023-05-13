exports.up = async (knex) => {
    await knex.schema.alterTable('contacts', (table) => {
        table.string('alt_mobile');
    });
};
  
exports.down = async (knex) => {
    await knex.schema.alterTable('contacts', (table) => {
        table.dropColumn('alt_mobile');
    });
};