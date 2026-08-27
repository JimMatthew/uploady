const createStores = require("./createStores");
const initDatabase = require("./initDatabase");

const databaseType =
  process.env.DB_TYPE || "mongo";

const stores = createStores({
  databaseType,
});

module.exports = {
  ...stores,

  init: () =>
    initDatabase(databaseType),
};