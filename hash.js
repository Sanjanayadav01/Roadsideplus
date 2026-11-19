// bcrypt for hashing. If the native module fails to install on a laptop,
// the pure-JS bcryptjs (same API) is used automatically.
let lib;
try { lib = require('bcrypt'); } catch (e) { lib = require('bcryptjs'); }
module.exports = {
  hash: (plain) => lib.hash(plain, 10),
  compare: (plain, hashed) => lib.compare(plain, hashed),
};
