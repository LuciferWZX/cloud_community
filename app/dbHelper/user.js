const knex = require('../../config/db_config');
const userModel = require("../models/user");
const {TB_AUTH,TB_USER} = require("./tables");

const TIMEOUT = 1000;
/**
 * 查询用户表是否存在该字段的值
 * @param columnName
 * @param value
 * @returns {Promise<boolean>}
 */
const checkExistInUser=async ({columnName,value})=>{
    const result =await knex(TB_USER)
        .where(
            {
                [columnName]:value
            }
        )
        .select()
        .limit(1)
        .timeout(TIMEOUT)
        .catch(err=>{
            console.log(`查询出错${err.message} ,${err.stack}`.red);
            return null;
        })
    return result.length !== 0;
}
/**
 * 注册用户
 * @param id
 * @param username
 * @param password
 * @param email
 * @param sex
 * @param nickname
 * @returns {Promise<boolean>}
 */
const isRegisterSuccess=async ({id,username,password,email,sex,nickname})=>{
    const result = await knex(TB_USER)
        .insert({
            id,
            username,
            password,
            email,
            sex,
            nickname
        })
        .timeout(TIMEOUT)
        .catch(err => {
            console.log(`新增user出错:${err.message} ,${err.stack}`.red);
            return null;
        });
    return result[0] === 0;

}
/**
 * 用户登录
 * @param userColumn
 * @param username
 * @param password
 * @returns {Promise<null|*>}
 */
const userLogin=async ({userColumn,email,password})=>{
    const result =await knex(TB_USER)
        .where({
            [userModel.email]:email,
            [userModel.password]:password
        })
        .join(TB_AUTH,`${TB_USER}.auth`,"=",`${TB_AUTH}.id`)
        .select(
            userColumn
        )
        .limit(1)
        .timeout(TIMEOUT)
        .catch(err=>{
            console.log(`用户登录出错${err.message} ,${err.stack}`.red);
            return null;
        });
    if(result.length === 0){
        return null
    }
    return result[0];
}
/**
 * 查询好友某几个列，更具好友的id
 * @param useColumn
 * @param friendId
 * @returns {Promise<null|*>}
 */
const queryFriendInfo=async ({useColumn,friendId})=>{
    const result = await knex(TB_USER)
        .select(
            useColumn
        )
        .where({
            [userModel.id]:friendId
        })
        .timeout(TIMEOUT)
        .catch(err=>{
            console.log(`查询该用户出错${err.message} ,${err.stack}`.red);
            return null;
        });
    if(result.length === 0){
        return null
    }
    return result[0];
}


module.exports = {
    checkExistInUser,
    isRegisterSuccess,
    userLogin,
    queryFriendInfo
}
