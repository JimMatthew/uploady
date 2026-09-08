const createStores = require("./createStores");
const initDatabase = require("./initDatabase");

const databaseType =
  process.env.DATABASE_TYPE || "sqlite";

const stores = createStores({
  databaseType,
});

module.exports = {
  ...stores,

  init: () =>
    initDatabase(databaseType),
};