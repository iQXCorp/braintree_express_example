const db = require('../databases/arango')

module.exports = collection = db.collection('Oauth');
collection.create()
.then(() => {

});
