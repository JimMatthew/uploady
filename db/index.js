const createStores = require("./createStores");

module.exports = createStores({
  databaseType: process.env.DB_TYPE || "mongo",
});