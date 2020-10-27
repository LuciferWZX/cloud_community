const userModel = require("../models/user");
const {CODE_STATUS} = require("../../config/constants");
const  {checkExistInUser,isRegisterSuccess} =require("../dbHelper/user") ;
const intFormat = require("biguint-format");
const FlakeId = require("flake-idgen");
const authModel = require("../models/auth");
const {saveSingleMessage} = require("../dbHelper/singleMsg");
const {searchUserByNicknameOrEmail,userLogin} = require("../dbHelper/user");
const {
    checkValidToken,
    getStringItem,
    removeItem,
    insertStringItem,
    getString,
    generateVerify,
    checkEmail,
    sendVerifyToEmail,
    encryption,
    generateToken,
    insertItem,
    getHeaderToken,
    getItem,
    insertListItem
} = require("../utils/util");

const {client} = require("../../config/redis_config");
const {TB_USER,TB_AUTH} = require("../dbHelper/tables");

const router = require('koa-router')();


/**
 * 用户注册（简易版）
 * @param {password,username,email}
 */
// router.post('/user/register',async function (ctx) {
//     const {password, username,email} = ctx.request.body;
//     //查询用户名是否存在
//     const isUsernameExist =await checkExistInUser({
//         columnName:userModel.username,
//         value:username
//     });
//     //存在就返回提示
//     if(isUsernameExist){
//         return ctx.body={
//             code:CODE_STATUS.IS_EXIST,
//             message: "改用户名已存在！",
//             data:null
//         }
//     }
//     //查询邮箱是否存在
//     const isEmailExist = await checkExistInUser({columnName:userModel.email,value:email});
//     //存在就返回提示
//     if(isEmailExist){
//         return ctx.body={
//             code:CODE_STATUS.IS_EXIST,
//             message: "改邮箱已被注册！",
//             data:null
//         }
//     }
//     //生成雪花ID
//     const flakeIdGen = new FlakeId();
//     //插入数据库
//     const result = await isRegisterSuccess({
//         id:intFormat(flakeIdGen.next(), 'dec'),
//         username,
//         password:encryption(password),
//         email
//     })
//     //注册失败
//     if(!result){
//         return ctx.body={
//             code:CODE_STATUS.IS_FAILED,
//             message: "注册失败！",
//             data:null
//         }
//     }
//     //注册成功
//     return ctx.body={
//         code:CODE_STATUS.IS_OK,
//         message: "注册成功！",
//         data:null
//     }
//
// });

/**
 * 用户注册（邮箱注册）
 * @{password,username,email,verify}
 */
router.post('/user/registerByEmail',async function (ctx) {
    const {
        password,
        username,
        email,
        verify,
        sex,
        nickname
    } = ctx.request.body;
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
            message: "该用户名已存在！",
            data:null
        }
    }
    //查询邮箱是否存在
    const isEmailExist = await checkExistInUser({columnName:userModel.email,value:email});
    //存在就返回提示
    if(isEmailExist){
        return ctx.body={
            code:CODE_STATUS.IS_EXIST,
            message: "该邮箱已被注册！",
            data:null
        }
    }

    //生成雪花ID
    const flakeIdGen = new FlakeId();
    const id = intFormat(flakeIdGen.next(), 'dec');
    //将我的id加入他们的消息列表中
    await insertListItem(`${id}:conversation`,["6721356004241440768","6726762769837719552"]);
    //我添加
    await insertListItem(`6721356004241440768:conversation`,id);
    //我先发送一条消息给他
    await saveSingleMessage({
        creatorId:"6721356004241440768",
        receiveId:id,
        contentType: 0,
        content:"欢迎使用我的聊天系统，目前还未开发完成"
    });
    //测试账号
    await saveSingleMessage({
        creatorId:"6726762769837719552",
        receiveId:id,
        contentType: 0,
        content:"我是测试账号"
    });
    //插入数据库
    const result = await isRegisterSuccess({
        id:id,
        username,
        password:encryption(password),
        email,
        sex,
        avatar:"https://ss1.bdstatic.com/70cFuXSh_Q1YnxGkpoWK1HF6hhy/it/u=2885279926,3290523587&fm=26&gp=0.jpg",
        nickname
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
 * 用户邮箱登录
 * @param password
 * @param username
 */
router.post('/user/emailLogin',async function (ctx){
    const {password, email} = ctx.request.body;
    const result = await userLogin({
        userColumn:[
            `${TB_USER}.${userModel.id}`,
            `${TB_USER}.${userModel.username}`,
            `${TB_USER}.${userModel.email}`,
            `${TB_USER}.${userModel.auth}`,
            `${TB_USER}.${userModel.avatar}`,
            `${TB_USER}.${userModel.nickname}`,
            `${TB_USER}.${userModel.phone}`,
            `${TB_USER}.${userModel.sex}`,
            `${TB_AUTH}.${authModel.authDesc}`,
        ],
        password:encryption(password),
        email:email
    });

    if(result===null){
        return ctx.body={
            code:CODE_STATUS.NOT_EXIST,
            data:null,
            message:"该用户不存在或者密码错误！"
        }
    }
    const token = generateToken({
        id:result.id
    },'token');
    const userToken = getStringItem("user-token",result.id);
    if(userToken){
        await removeItem("users",result.id);
    }
    await insertStringItem("user-token",result.id,token);
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
        return ctx.body={
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
    client.expire(email,300);
    //发送邮箱
    async function timeout() {
        return new Promise((resolve, reject) => {
            sendVerifyToEmail(email,{
                from:"2396423791@qq.com",
                to:email,
                subject:"吞噬兽账号注册",
                text:"别担心，只是测试",
                html:mailHtml
            },{
                error:(e)=>{
                    console.log('邮箱验证码发送失败'.red,e);
                    //邮箱发送失败
                    const state={
                        code:CODE_STATUS.EMAIL_SEND_ERR,
                        data:null,
                        message:"验证码发送失败"
                    }
                    resolve(state);
                },
                success:(response)=>{
                    const state={
                        code:CODE_STATUS.IS_OK,
                        data:null,
                        message:"验证码发送成功"
                    };
                    //发送成功
                    resolve(state);
                }
            });
        })
    }
    await timeout().then(state => {
        return ctx.body = state;
    })
});

/**
 * 根据header里面的authorization里的token来获取redis里面的用户
 */
router.get('/user/fetchCurrent',async function (ctx){
    const {id} = getHeaderToken(ctx.header.authorization,'token');
    //验证token是否过期
    const isOk = await checkValidToken(ctx.header.authorization);
    if(!isOk){
        ctx.status = 401;
        ctx.body = '受保护资源，token失效';
        return ctx
    }

    const user =await getItem('users',id);
    if(user){
        //const {_socket}=global;
        //通知老的用户下线(目前返回的是新的用户的token和id)
        _socket.emit("user-channel",JSON.stringify({
            actionType:"force-user-logout",
            response:{
                code:200,
                data:{
                    id:user.id,
                    token:user.token
                },
                message:'该用户正在其他地方登录'
            }
        }));
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
/**
 * 用户退出登录
 */
router.get('/user/logout',async function (ctx){
    const {id} = getHeaderToken(ctx.header.authorization,'token');
    try{
        await removeItem('user-token',id);
        await removeItem('users',id);
        return ctx.body={
            code:CODE_STATUS.IS_OK,
            data:null,
            message:"退出登录成功"
        }
    }catch (e){
        return ctx.body={
            code:CODE_STATUS.IS_FAILED,
            data:null,
            message:e.toString()
        }
    }


});
/**
 * 精确查询用户，只匹配一人
 */
router.get('/user/searchUser',async function (ctx){
    const {id} = getHeaderToken(ctx.header.authorization,'token');
    const {searchValue}=ctx.request.query;
    try{
        const data =await searchUserByNicknameOrEmail(searchValue,id);
        return ctx.body={
            code:CODE_STATUS.IS_OK,
            data:data,
            message:"查询成功"
        }
    }catch (e){
        return ctx.body={
            code:CODE_STATUS.IS_FAILED,
            data:null,
            message:e.toString()
        }
    }

})
module.exports = router;