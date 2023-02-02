exports.up = async (knex) => {
    await knex.schema.createTable("main.chanakya_roles", (table) => {
        table.increments();
        table.string("roles",225).unique().notNullable();
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable("main.chanakya_roles");
};