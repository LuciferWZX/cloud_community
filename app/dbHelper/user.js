const knex = require('../../config/db_config');
const userModel = require("../models/user");
const friendModel = require("../models/friend");
const {TB_AUTH,TB_USER,TB_FRIEND} = require("./tables");

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
const isRegisterSuccess=async ({id,username,password,email,sex,nickname,avatar})=>{
    const result = await knex(TB_USER)
        .insert({
            id,
            username,
            password,
            email,
            sex,
            nickname,
            avatar
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

const searchUserByNicknameOrEmail = async (param,id)=>{
    const result = await knex(TB_USER)
        .select()
        .column(
            `${TB_USER}.${userModel.id}`,
            `${TB_USER}.${userModel.nickname}`,
            `${TB_USER}.${userModel.avatar}`,
            `${TB_USER}.${userModel.email}`,
            )
        .where(function (){
            this.where(userModel.nickname,param).orWhere(userModel.email,param)
        })
        .andWhere(
            userModel.id,'!=',id
        )
        .limit(1)
        .timeout(TIMEOUT)
        .catch(err=>{
            console.log(`查询该用户出错${err.message} ,${err.stack}`.red);
            return null;
        });

    if(result.length>0){
        const result2 = await knex(TB_FRIEND)
            .select(friendModel.inviteStatus)
            .where(function (){
                this.where(friendModel.sendId,"=",id).andWhere(friendModel.receiveId,result[0].id)
            })
        let inviteStatus;
        if(result2.length>0){
            inviteStatus=result2[0].invite_status
        }else{
            //未找到该好友的申请
            inviteStatus=-1
        }
        return {...result[0],inviteStatus:inviteStatus}
    }
    return  null
}

module.exports = {
    checkExistInUser,
    isRegisterSuccess,
    userLogin,
    queryFriendInfo,
    searchUserByNicknameOrEmail
}
