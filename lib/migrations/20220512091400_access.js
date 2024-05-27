exports.up = async (knex) => {
    await knex.schema.createTable("main.chanakya_access", (table) => {
      table.increments();
      table.integer("user_role_id").references("id").inTable("main.chanakya_user_roles");
      table.integer("access").notNullable();
      table.unique(['user_role_id', 'access']);
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable("main.chanakya_access");
};