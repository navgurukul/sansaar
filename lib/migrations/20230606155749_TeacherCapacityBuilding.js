exports.up = async (knex, Promise) => {
    return knex.schema.createTable('main.teacher_capacity_building',(table)=>{
        table.increments('id');
        table.integer('user_id')
        .unsigned()
        .references('id')
        .inTable('main.users')
        .onDelete('CASCADE')
        table.string('zone');
        table.string('school_name');
        table.string('teacher_name');
        table.integer('school_id')        
        table.integer('teacher_id')
        table.string('class_of_teacher');
        table.string('email');
    })
};

exports.down = async (knex, Promise) => {
    return knex.schema.dropTable('main.teacher_capacity_building');
};