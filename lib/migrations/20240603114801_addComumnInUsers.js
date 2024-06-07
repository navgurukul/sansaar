exports.up = async (knex) => {
    await knex.schema.alterTable('main.users', (table) => {
        // use user_name unique

        table.string('user_name').nullable().unique();
        table.string('password').nullable();
        table.string('pass_iv').nullable();
    });
    await knex.schema.alterTable('main.users', (table) => {
        table.string('email').nullable().alter();
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('main.users', (table) => {
        table.dropColumn('user_name');
        table.dropColumn('password');
        table.dropColumn('pass_iv');
    });
    await knex('main.users')
        .whereNull('email')
        .delete();
    await knex.schema.alterTable('main.users', (table) => {
        table.string('email').notNullable().alter();
    });
};

