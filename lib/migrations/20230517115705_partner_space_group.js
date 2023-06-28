exports.up = async (knex, Promise) => {
    return knex.schema.createTable('main.space_group',(table)=>{
        table.increments('id');
        table.string('group_name');
        table.integer('space_id')
        .unsigned()
        .references('id')
        .inTable('main.partner_space')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
        table.string('web_link');
        table.string('android_link');
        table.string('crca_link');
    })
};

exports.down = async (knex, Promise) => {
    return knex.schema.dropTable('main.space_group');
};
