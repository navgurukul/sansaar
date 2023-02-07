exports.up = async (knex) => {
    await knex.schema.alterTable('main.users', (table) => {
        table.datetime('last_login_at');
    });
};
exports.down = async (knex) => {
    await knex.schema.alterTable('main.users', (table) => {
        table.dropColumn('last_login_at');
    });
};