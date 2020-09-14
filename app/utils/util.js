
const crypto = require('crypto');
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
const insertItem=async (name,key,obj)=>{
    await client.hset(name,key,JSON.stringify(obj))
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
module.exports = {
    encryption,
    decrypt,
    insertItem,
    getItem,
    updateList,
    removeItem,
    generateToken,
    getHeaderToken
}