const users = require("./userController");
const controller = (app)=>{
    const routers=[
        {name:'users',file:users}
    ];
    routers.forEach((router,index,array)=>{
        app.use(router.file.routes(), router.file.allowedMethods());
    })
}
module.exports = controller;