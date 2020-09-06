const userModel = require("../models/user");
const {CODE_STATUS} = require("../../config/constants");
const  {checkExistInUser,isRegisterSuccess} =require("../dbHelper/user") ;
const intFormat = require("biguint-format");
const FlakeId = require("flake-idgen");
const router = require('koa-router')();
router.get('/user', function (ctx, next) {
    ctx.body = 'this is a users response!'
});
/**
 * 用户注册（简易版）
 */
router.post('/user/register',async function (ctx) {
    const {password, username,email} = ctx.request.body;
    const isUsernameExist =await checkExistInUser({
        columnName:userModel.username,
        value:username
    });
    if(isUsernameExist){
        return ctx.body={
            code:CODE_STATUS.IS_EXIST,
            message: "改用户名已存在！",
            data:null
        }
    }
    const isEmailExist = await checkExistInUser({columnName:userModel.email,value:email});
    if(isEmailExist){
        return ctx.body={
            code:CODE_STATUS.IS_EXIST,
            message: "改邮箱已被注册！",
            data:null
        }
    }
    const flakeIdGen = new FlakeId();
    const result = await isRegisterSuccess({
        id:intFormat(flakeIdGen.next(), 'dec'),
        username,
        password,
        email
    })
    if(result){
        return ctx.body={
            code:CODE_STATUS.IS_OK,
            message: "注册成功！",
            data:null
        }
    }
    return ctx.body={
        code:CODE_STATUS.IS_FAILED,
        message: "注册失败！",
        data:null
    }
});
module.exports = router;