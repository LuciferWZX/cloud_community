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
 * @returns {Promise<boolean>}
 */
const isRegisterSuccess=async ({id,username,password,email})=>{
    const result = await knex(TB_USER)
        .insert({
            id,
            username,
            password,
            email
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
const userLogin=async ({userColumn,username,password})=>{
    const result =await knex(TB_USER)
        .where({
            [userModel.username]:username,
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

module.exports = {
    checkExistInUser,
    isRegisterSuccess,
    userLogin
}
