const users = require("./userController");
const koaJwt = require('koa-jwt');
const controller = (app)=>{
    app.use(koaJwt({
        secret:'token'
    }).unless({
        path:[
            /\/user\/login/,
            /\/user\/register/,
        ]
    }))
    const routers=[
        {name:'users',file:users}
    ];
    routers.forEach((router,index,array)=>{
        app.use(router.file.routes(), router.file.allowedMethods());
    })

}
module.exports = controller;