exports.up = async (knex) => {
    return knex.schema.createTable('demo_campus', t => {
        t.increments('id')
        t.string('campus')
    })
};


exports.down = async (knex) => {
    await knex.schema.dropTable('demo_campus')
};
