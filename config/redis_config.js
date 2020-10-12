const redis = require('redis');
const config = {
    port:6379,
    host:'127.0.0.1'
}
let client;
client = redis.createClient(config.port,config.host);
const nodeRedis=(app)=>{
    client.on('connect',()=>{
        console.log(`redis连接成功:端口->${config.port},主机:${config.host}`.green)
    });
    client.on('ready',function(){
        console.log(`redis已准备`);
    });
    client.on('end',function(err){
        console.log('结束'.gray);
    });
    client.on('error', function (err) {
        console.log(`出错:${err}`.red);
    });
}
module.exports={
    nodeRedis,
    client
}