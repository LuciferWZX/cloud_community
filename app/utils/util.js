
const crypto = require('crypto');
const {CODE_STATUS} = require("../../config/constants");
const {client} = require("../../config/redis_config");
const key = "9vApxLk5G3PAsJrM";
const iv = "FnJL7EDzjqWjcaY9";
const algorithm = 'aes-128-cbc'; // 加密算法和操作模式
/**
 * 加密
 * @returns {string}
 * @param src
 */
const encryption = (src)=>{
    let sign = '';
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    sign += cipher.update(src, 'utf8', 'hex');
    sign += cipher.final('hex');
    return sign;
}
/**
 * 解密
 * @returns {string}
 * @param sign
 */
const decrypt = (sign)=>{
    let src = '';
    const cipher = crypto.createDecipheriv(algorithm, key, iv);
    src += cipher.update(sign, 'hex', 'utf8');
    src += cipher.final('utf8');
    return src;
}
/**
 * redis插入
 * @param name
 * @param key
 * @param obj
 * @returns {Promise<void>}
 */
const insertItem=async (name,key,obj=null)=>{
    if(obj){
        await client.hset(name,key,JSON.stringify(obj))
    }else{
        await client.set(name,key);
    }

}
const insertStringItem=async (name,key,string)=>{
    await client.hset(name,key,string);
}
/**
 * redis获取list
 * @param name
 * @param key
 * @returns {Promise<Uint8Array|BigInt64Array|*[]|Float64Array|Int8Array|Float32Array|Int32Array|Uint32Array|Uint8ClampedArray|BigUint64Array|Int16Array|Uint16Array>}
 */
const getItem=async (name,key)=>{
   return await new Promise((resolve => {
         client.hget(name,key,(err,response)=>{
            if(!err){
                return resolve(JSON.parse(response))
            }
            return null
        });
    }))
}
const getStringItem=async (name,key)=>{
    return await new Promise((resolve => {
        client.hget(name,key,(err,response)=>{
            if(!err){
                return resolve(response)
            }
            return null
        });
    }))
}
/**
 * redis获取list
 * @param name
 * @param key
 * @returns {Promise<unknown>}
 */
const getItemList=async (name)=>{
    return await new Promise((resolve => {
        client.lrange(name,0,-1,(err,response)=>{
            if(!err){
                return resolve(response)
            }
            return null
        });
    }))
}
/**
 * 获取set
 * @param name
 * @returns {Promise<unknown>}
 */
const getString=async (name)=>{
    return await new Promise((resolve => {
        client.get(name,(err,response)=>{
            if(!err){
                return resolve(response)
            }
            return null
        });
    }))
}
/**
 * redis删除
 * @param name
 * @param key
 * @returns {Promise<void>}
 */
const removeItem = async (name,key)=>{
    await client.hdel(name,key)
}
/**
 * redis更新
 * @param name
 * @param updateByKey
 * @param keyValue
 * @param newObj
 * @returns {Promise<void>}
 */
const updateList=async (name,{updateByKey,keyValue},newObj)=>{
    const list = await  getList(name);
    let index = -1;
    for (let i=0;i<list.length;i++){
        if(list[i][updateByKey] === keyValue){
            index = i;
        }
    }
    if(index>0){
        await client.lset(name,index,JSON.stringify(newObj));
        console.log(`${name}更新成功`.green);
    }else{
        console.log(`${name}找不到Index`.yellow);
    }
}
/**
 * 生成token默认24小时过期
 * @param payload
 * @param secret
 * @param expiresIn
 * @returns {Buffer | string | number | PromiseLike<ArrayBuffer>}
 */
const generateToken=(payload={},secret,expiresIn='24h')=>{
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload,secret,{expiresIn})
}
/**
 * 获取头部token
 * @param authorization
 * @param secret
 * @returns {*}
 */
const getHeaderToken=(authorization,secret)=>{
    const jwt = require('jsonwebtoken');
    return jwt.verify(authorization.split(' ')[1],secret)
}
/**
 * 发送邮箱验证码
 * @param email
 * @param config
 * @param error
 * @param success
 * @returns {Promise<void>}
 */
const sendVerifyToEmail=async (email,config,{error,success})=>{
    const node_mailer = require('nodemailer');
    const smtpTransport = require('../../config/email_config');
    const transport = node_mailer.createTransport(smtpTransport);

    await transport.sendMail(config,function (err,response){
        if(err){
            console.log("发送失败:",err)
            error&&error(err);
        }else{
            console.log("发送成功");
            success&&success(response)
        }
        transport.close();
    });
}
/**
 * 邮箱验证
 * @param email
 * @returns {boolean}
 */
const checkEmail=(email)=>{
    const REG = new RegExp("^[a-z0-9]+([._\\-]*[a-z0-9])*@([a-z0-9]+[-a-z0-9]*[a-z0-9]+.){1,63}[a-z0-9]+$");
    return REG.test(email);
}
/**
 * 生成随机数
 * @param length
 * @returns {string}
 */
const generateVerify=(length=6)=>{
    let verify = "";
    for(let i=0;i<length;i++)
    {
        verify+=Math.floor(Math.random()*10);
    }
    return verify
}
/**
 * 校验是否token有效
 * @param authorization
 * @returns {Promise<boolean>}
 */
const checkValidToken =async (authorization)=>{
    const {id} = getHeaderToken(authorization,'token');
    const token = authorization.split(' ')[1];
    const cToken = await getStringItem("user-token",id);
    return token ===cToken
}
/**
 * 字符串分割数组
 * @param msg 分割的字符串
 * @param len 分割的长度
 * @returns {[]}
 */
const splitStringToArray = (msg,len)=>{
    const num = Math.ceil((msg.length)/len);
    let tempArr = [];
    for (let i=0;i<num;i++){
        tempArr.push(msg.substring(i*len,(i+1)*len))
    }
    return tempArr
}
module.exports = {
    encryption,
    decrypt,
    insertItem,
    getString,
    getItem,
    getItemList,
    updateList,
    removeItem,
    generateToken,
    getHeaderToken,
    sendVerifyToEmail,
    checkEmail,
    checkValidToken,
    insertStringItem,
    getStringItem,
    generateVerify,
    splitStringToArray
}