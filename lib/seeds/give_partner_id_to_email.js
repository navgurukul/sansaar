
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  let Email = ['saritatalacha44@gmail.com','waterborneoanfr6fi@fake.com','sahilkhambhu379@gmail.com', 'renuka2kiran@gmail.com', 'raviode8@gmail.com', 'csrashmibhide@gmail.com', 'princeparmar6011@gmail.com', 'methwanidev9@gmail.com', 'ayushadarsh2007@gmail.com', 'shahnitish222@gmail.com', 'Varunjarwani@gmail.com', 'kapuriaarun9429@gmail.com', 'prajapativaktaram1234567@gmail.com', 'snehaamlani46@gmail.com', 'nooralam91066@gmail.com', 'brajeshratour68543@gmail.com', 'maaazmansuri@gmail.com', 'nazneenshaikh462@gmail.com', 'sataavari844@gmail.com', 'musakhatumbra@gmail.com', 'rajan.lija@gmail.com', 'arpitaprajapati663@gmail.com', 'ansariaafiyasrafansari@gmail.com', 'kr9737663165@gmail.com','prashanttomar446@gmail.com', 'rs9924773165@gmail.com', 'shaikhafsari922@gmail.com', 'rajputaditya232008@gmail.com', 'palakbasrani60@gmail.com', 'mdsarfrazshaikh5@gmail.com', '5632.stkabirdio@gmail.com', 'tirthparmar602@gmail.com', 'arpitaprajapati663@gmail.com',   'ayeshapatni123@gmail.com', 'shuvamghosh7501@gmail.com', 'sahilkhambhu379@gmail.com', 'isranijay24@gmail.com', 'raviode8@gmail.com', 'malavikab2001@gmail.com','himeshmulchandani08@gmail.com', 'mayurmethwani13@gmail.com', 'shahnitish56@gmail.com','ayushadarsh2007@gmail.com', 'sirwaniyash8877@gmail.com', 'brajeshratour68543@gmail.com', 'sumity55552@gmail.com', 'tanishamamalani@gmail.com', 'rehanshaikh9327@gmail.com', 'maaazmansuri@gmail.com', 'asnashaikh1207@gmail.com', 'azfarmahera@gmail.com', 'moinuddiqureshi9016@gmail.com', 'rajan.lija@gmail.com', 'arpitaprajapati663@gmail.com', 'asifmaleksirin@gmail.com', 'rs9924773165@gmail.com', 'rajputaditya232008@gmail.com', 'kr9737663165@gmail.com', 'taslimkhan1790890@gmail.com', 'palakbasrani@60gmail.com', 'mdsarfrazshaikh5@gmail.com', '7758.stkabirdio@gmail.com', 'tirthparmar602@gmail.com', 'mehekfatima121@gmail.com', 'shivanits038@gmail.com' ]
  const userEmail =  await knex('users').select('email')
  let user_Emails = userEmail.map(emai => emai.email);
  for (let email of Email){
    if (user_Emails.includes(email)){
        await knex('users').update('partner_id', 21).where('email', email)
    }
  }
};
