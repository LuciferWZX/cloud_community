let colors = require('colors');//控制台输出颜色
global.__app = __dirname+"/app";
const Koa = require('koa');
const {nodeRedis} = require("./config/redis_config");
const logger = require('koa-logger')//日志中间件
const koaBody = require('koa-body')({
    multipart: true,  // 允许上传多个文件
});
const onerror = require('koa-onerror');//异常处理中间件
const {initSocket} = require("./config/socket_config");
const app = new Koa();
const serverPort = 3000;
const controller=require("./app/controllers/index");
const server = require('http').createServer(app.callback());
const io = require('socket.io')(server);

onerror(app);
nodeRedis(app);//连接redis
initSocket(io);
app.use(koaBody);


app.on('error', (err,ctx)=>{
    console.error(`服务出错 ${err},${ctx}`.red);
});
//token出错
app.use(async function(ctx, next){

    return next().catch((err) => {
        if (401 === err.status) {
            ctx.status = 401;
            ctx.body = '受保护资源，token失效';
        } else {
            throw err;
        }
    });
});
//404设置
// app.use(async (ctx, next) => {
//     await next();
//     if (ctx.status === 404) {
//         ctx.status = 404;
//         return ctx.body={
//             code:200,
//             msg:"登录成功",
//         }
//     }
// });
app.use(logger())
controller(app);
server.listen(serverPort,()=>{
    console.log(`服务启动,端口为：${serverPort}`.green);
});
module.exports={
    io,
    app
}