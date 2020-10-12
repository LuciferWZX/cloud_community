const userModel = require("../models/user");
const {CODE_STATUS} = require("../../config/constants");
const  {checkExistInUser,isRegisterSuccess} =require("../dbHelper/user") ;
const intFormat = require("biguint-format");
const FlakeId = require("flake-idgen");
const authModel = require("../models/auth");
const {getString} = require("../utils/util");
const {client} = require("../../config/redis_config");
const {generateVerify} = require("../utils/util");
const {checkEmail} = require("../utils/util");
const {sendVerifyToEmail} = require("../utils/util");
const {TB_USER,TB_AUTH} = require("../dbHelper/tables");
const {userLogin} = require("../dbHelper/user");
const {encryption,generateToken,insertItem,getHeaderToken,getItem} = require("../utils/util");
const router = require('koa-router')();
router.get('/user', function (ctx) {
    ctx.body = 'this is a users response!'
});

/**
 * 用户注册（简易版）
 * @param {password,username,email}
 */
router.post('/user/register',async function (ctx) {
    const {password, username,email} = ctx.request.body;
    //查询用户名是否存在
    const isUsernameExist =await checkExistInUser({
        columnName:userModel.username,
        value:username
    });
    //存在就返回提示
    if(isUsernameExist){
        return ctx.body={
            code:CODE_STATUS.IS_EXIST,
            message: "改用户名已存在！",
            data:null
        }
    }
    //查询邮箱是否存在
    const isEmailExist = await checkExistInUser({columnName:userModel.email,value:email});
    //存在就返回提示
    if(isEmailExist){
        return ctx.body={
            code:CODE_STATUS.IS_EXIST,
            message: "改邮箱已被注册！",
            data:null
        }
    }
    //生成雪花ID
    const flakeIdGen = new FlakeId();
    //插入数据库
    const result = await isRegisterSuccess({
        id:intFormat(flakeIdGen.next(), 'dec'),
        username,
        password:encryption(password),
        email
    })
    //注册失败
    if(!result){
        return ctx.body={
            code:CODE_STATUS.IS_FAILED,
            message: "注册失败！",
            data:null
        }
    }
    //注册成功
    return ctx.body={
        code:CODE_STATUS.IS_OK,
        message: "注册成功！",
        data:null
    }

});

/**
 * 用户注册（邮箱注册）
 * @{password,username,email,verify}
 */
router.post('/user/registerByEmail',async function (ctx) {
    const {password, username,email,verify} = ctx.request.body;
    //redis查询验证码
    const emailVerify = await getString(email);
    //redis里不存在验证码说明没有获取或者过期
    if(emailVerify===null){
        return ctx.body={
            code:CODE_STATUS.VERIFY_EXPIRED,
            message: "验证码已过期",
            data:null
        }
    }
    //判断验证码是否输入正确
    if(verify !== emailVerify.toString()){
        return ctx.body={
            code:CODE_STATUS.IS_FAILED,
            message: "验证码不正确！",
            data:null
        }
    }
    //查询用户名是否存在
    const isUsernameExist =await checkExistInUser({
        columnName:userModel.username,
        value:username
    });
    //存在就返回提示
    if(isUsernameExist){
        return ctx.body={
            code:CODE_STATUS.IS_EXIST,
            message: "改用户名已存在！",
            data:null
        }
    }
    //查询邮箱是否存在
    const isEmailExist = await checkExistInUser({columnName:userModel.email,value:email});
    //存在就返回提示
    if(isEmailExist){
        return ctx.body={
            code:CODE_STATUS.IS_EXIST,
            message: "改邮箱已被注册！",
            data:null
        }
    }

    //生成雪花ID
    const flakeIdGen = new FlakeId();
    //插入数据库
    const result = await isRegisterSuccess({
        id:intFormat(flakeIdGen.next(), 'dec'),
        username,
        password:encryption(password),
        email
    })
    //注册失败
    if(!result){
        return ctx.body={
            code:CODE_STATUS.IS_FAILED,
            message: "注册失败！",
            data:null
        }
    }
    //注册成功
    return ctx.body={
        code:CODE_STATUS.IS_OK,
        message: "注册成功！",
        data:null
    }

});

/**
 * 用户登录
 * @param password
 * @param username
 */
router.post('/user/login',async function (ctx){
    const {password, username} = ctx.request.body;
    const result = await userLogin({
        userColumn:[
            `${TB_USER}.${userModel.id}`,
            `${TB_USER}.${userModel.username}`,
            `${TB_USER}.${userModel.email}`,
            `${TB_USER}.${userModel.auth}`,
            `${TB_USER}.${userModel.avatar}`,
            `${TB_USER}.${userModel.phone}`,
            `${TB_USER}.${userModel.sex}`,
            `${TB_AUTH}.${authModel.authDesc}`,
        ],
        password:encryption(password),
        username:username
    });
    if(result===null){
        return ctx.body={
            code:CODE_STATUS.NOT_EXIST,
            data:null,
            message:"该用户不存在！"
        }
    }
    const token = generateToken({
        id:result.id
    },'token');
    await insertItem("users", result.id,{...result, token});
    return ctx.body={
        code:CODE_STATUS.IS_OK,
        data:{
            ...result,
            token:token
        },
        message:"登录成功"
    }
});

/**
 * 发送邮箱验证码
 * @param email
 */
router.get('/user/sendVerifyToEmail',async function (ctx){
    const {email}=ctx.request.query;
    if(!checkEmail(email)){
        ctx.body={
            code:CODE_STATUS.IS_FAILED,
            data:null,
            message:"邮箱格式不正确"
        }
    }
    //生成随机验证码6位
    const verify = generateVerify(6);
    //验证码样式
    let mailHtml=`'<div>已经发送了,验证码<span style="color: lightseagreen">${verify}</span></div>`;
    //存入redis
    await insertItem(email,verify);
    //设置过期时间
    client.expire(email,60);
    //发送邮箱
    await sendVerifyToEmail(email,{
        from:"2396423791@qq.com",
        to:email,
        subject:"吞噬兽账号注册",
        text:"别担心，只是测试",
        html:mailHtml
    },{
        error:(e)=>{
            //邮箱发送失败
            ctx.body={
                code:CODE_STATUS.EMAIL_SEND_ERR,
                data:null,
                message:"邮箱发送失败"
            }
        },
        success:(response)=>{
            //发送成功
            ctx.body={
                code:CODE_STATUS.IS_OK,
                data:null,
                message:"邮箱发送成功"
            }
        }
    });

});

/**
 * 根据header里面的authorization里的token来获取redis里面的用户
 */
router.get('/user/fetchCurrent',async function (ctx){
   const {id} = getHeaderToken(ctx.header.authorization,'token');
   const user =await getItem('users',id);
   if(user){
       return ctx.body={
           code:CODE_STATUS.IS_OK,
           data:user,
           message:"获取用户信息成功"
       }
   }
    return ctx.body={
        code:CODE_STATUS.IS_FAILED,
        data:user,
        message:"获取用户信息失败"
    }

});

module.exports = router;