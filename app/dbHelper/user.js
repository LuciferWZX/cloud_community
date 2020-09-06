const knex = require('../../config/db_config');
const TB_NAME = 'tb_cc_user';
const TIMEOUT = 1000;
/**
 * 查询用户表是否存在该字段的值
 * @param columnName
 * @param value
 * @returns {Promise<boolean>}
 */
const checkExistInUser=async ({columnName,value})=>{
    const result =await knex(TB_NAME)
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
    const result = await knex(TB_NAME)
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
module.exports = {
    checkExistInUser,
    isRegisterSuccess
}
