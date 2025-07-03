const HauteCouture = require('haute-couture');
const Package = require('../package.json');
const userRoutes = require('./routes/users');
// const userService = require('./service/user');
// const userService = require('./services/user');


// exports.plugin = {
//   pkg: Package,
//   register: HauteCouture.using(),
// };

exports.plugin = {
  pkg: Package,
 
  register: async (server, options) => {
    // server.method('userService', () => userService(db, logger));

    // server.route(userRoutes);

    await HauteCouture.using()(server, options);


    // Custom plugin code can go here
    // console.log("server", server);
    // console.log("options", options);

   
  },
};
