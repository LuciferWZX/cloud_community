let colors = require('colors');//控制台输出颜色
global.__app = __dirname+"/app";
const Koa = require('koa');
const logger = require('koa-logger')//日志中间件
const koaBody = require('koa-body')({
    multipart: true,  // 允许上传多个文件
});
const onerror = require('koa-onerror');//异常处理中间件
const app = new Koa();
const serverPort = 3000;
onerror(app);
app.use(koaBody);
const controller=require("./app/controllers/index");
app.on('error', (err,ctx)=>{
    console.error(`server-error ${err},${ctx}`.red);
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
app.listen(serverPort,()=>{
    console.log(`服务启动,端口为：${serverPort}`.green);
});
