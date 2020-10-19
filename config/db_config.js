const knex = require('knex')({
    client:'mysql',
    connection:{
        host:'127.0.0.1',
        user:'root',
        password:'123456',
        database:'db_cloud_community'
    },
    debug:false
});
module.exports = knex;