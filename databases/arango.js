'use strict'
const arangojs = require('arangojs');

let {Database, aql} = arangojs;
let database, url;

database = process.env.BT_ARANGODB_DB;
url = process.env.ARANGODB_URL;

const db = module.exports = arangojs({
  url: url,
  databaseName: database
});
