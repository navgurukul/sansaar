exports.seed = async function(knex) {
  // Deletes ALL existing entries
  let Email = ['example@gmail.com'];  // list of emails
  const userEmail =  await knex('users').select('email')
  let user_Emails = userEmail.map(emai => emai.email);
  for (let email of Email){
    if (user_Emails.includes(email)){
        await knex('users').update('partner_id', 904).where('email', email)
    }
  }
};

