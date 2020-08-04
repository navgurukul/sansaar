const HauteCouture = require('haute-couture');
const Package = require('../package.json');

// exports.plugin = {
//   pkg: Package,
//   register: HauteCouture.using(),
// };

exports.plugin = {
  pkg: Package,
  register: async (server, options) => {
    // Custom plugin code can go here
    // console.log("server", server);
    // console.log("options", options);

    await HauteCouture.using()(server, options);
  },
};
