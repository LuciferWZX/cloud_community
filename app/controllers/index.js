const users = require("./userController");
const messages = require("./messageController");
const koaJwt = require('koa-jwt');
const controller = (app)=>{
    app.use(koaJwt({
        secret:'token'
    }).unless({
        path:[
            /\/user\/login/,
            /\/user\/sendVerifyToEmail/,
            /\/user\/registerByEmail/,
            /\/user\/emailLogin/,
        ]
    }))
    const routers=[
        {name:'users',file:users},
        {name:'messages',file:messages},
    ];
    routers.forEach((router,index,array)=>{
        app.use(router.file.routes(), router.file.allowedMethods());
    })

}
module.exports = controller;