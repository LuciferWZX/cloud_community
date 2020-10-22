const knex = require('../../config/db_config');
const singleMsgModel = require("../models/singleMsg");
const userModel = require("../models/user");
const {TB_AUTH,TB_USER,TB_SINGLE_MSG} = require("./tables");
const TIMEOUT = 1000;
/**
 * 更具redis里面的个人conversations记录查询对方聊天信息状态
 * @param uId
 * @param userIds
 * @returns {Promise<unknown>}
 */
const queryConversationsList=async (uId,userIds)=>{
    return knex.transaction(trx => {
        const queries = [];
        userIds.forEach(id=>{
            const query = knex(TB_SINGLE_MSG)
                .where(function (){
                    this.where(singleMsgModel.creatorId, id).andWhere(singleMsgModel.receiveId, uId);
                })
                .orWhere(function (){
                    this.where(singleMsgModel.creatorId, uId).andWhere(singleMsgModel.receiveId, id);
                    //this.where(`${TB_USER}.${userModel.id}`, '=', id)
                })
                .andWhere(singleMsgModel.isDeleted, '!=', 1)

                .column(
                    `${TB_SINGLE_MSG}.${singleMsgModel.id}`,
                   `${TB_SINGLE_MSG}.${singleMsgModel.createTime}`,
                    `${TB_SINGLE_MSG}.${singleMsgModel.content}`,
                    `${TB_SINGLE_MSG}.${singleMsgModel.contentType} as type`,
                    {
                        nickname:knex.raw(
                            `(select ${userModel.nickname} from ${TB_USER} where ${userModel.id} = ${id} limit 1)`
                        )
                    },
                    //`${TB_SINGLE_MSG}.${singleMsgModel.creatorId} as friendId`,
                    {
                        avatar:knex.raw(
                            `(select ${userModel.avatar} from ${TB_USER} where ${userModel.id} = ${id} limit 1)`
                        )
                    },
                    {
                        friendId:knex.raw(
                            `(select ${userModel.id} from ${TB_USER} where ${userModel.id} = ${id} limit 1)`
                        )
                    },
                    {
                        unRead:knex.raw(
                            `(select count(*) from ${TB_SINGLE_MSG} where ${singleMsgModel.receiveId} = ${uId} and  ${singleMsgModel.creatorId} = ${id}  and ${singleMsgModel.isRead}=0)`
                        )
                    }
                )
                .select()
                .orderBy(singleMsgModel.createTime, "desc")
                .limit(1)
                .timeout(TIMEOUT)
                .transacting(trx);
            queries.push(query);
        })
        console.log(111,queries)
        Promise.all(queries)// Once every query is written
            .then(trx.commit)// We try to execute all of them
            .catch(trx.rollback)// And rollback in case any of them goes wrong
    });
}
/**
 * 根据id查询聊天记录
 * @param friendId
 * @param id
 * @param page
 * @param limit
 * @returns {Promise<null|*>}
 */
const queryChatList = async ({friendId,id,page=1,limit=1000})=>{
    return await knex(TB_SINGLE_MSG)
        .select()
        .where(function () {
            this.where(singleMsgModel.creatorId, friendId).andWhere(singleMsgModel.receiveId, id);
        })
        .orWhere(function () {
            this.where(singleMsgModel.creatorId, id).andWhere(singleMsgModel.receiveId, friendId);
        })
        .andWhere(singleMsgModel.isDeleted, '!=', 1)
        .limit(limit)
        .offset((page - 1) * limit)
        .timeout(TIMEOUT)
        .orderBy(singleMsgModel.createTime, 'desc')
        .catch(err => {
            console.log(`查询聊天记录出错${err.message} ,${err.stack}`.red);
            return null;
        });
}
const hasMoreMessageList = async ({friendId,id,page=1,limit=1000})=>{
    const msgCount = await knex(TB_SINGLE_MSG)
        .count('id' , {as: 'total'})
        .where(function () {
            this.where(singleMsgModel.creatorId, friendId).andWhere(singleMsgModel.receiveId, id);
        })
        .orWhere(function () {
            this.where(singleMsgModel.creatorId, id).andWhere(singleMsgModel.receiveId, friendId);
        })
        .andWhere(singleMsgModel.isDeleted, '!=', 1)
        .timeout(TIMEOUT)
        //.orderBy(singleMsgModel.createTime, 'desc')
        .catch(err => {
            console.log(`查询聊天记录出错${err.message} ,${err.stack}`.red);
            return null;
        });
    return page * limit < msgCount[0].total;

}
const saveSingleMessage = async (msgColumn)=>{

     const data = await knex(TB_SINGLE_MSG)
        .insert({
            [`${singleMsgModel.creatorId}`]: msgColumn.creatorId,
            [`${singleMsgModel.receiveId}`]: msgColumn.receiveId,
            [`${singleMsgModel.contentType}`]: msgColumn.contentType,
            [`${singleMsgModel.content}`]: msgColumn.content,
        })
         .timeout(TIMEOUT)
         .catch(err => {
             console.log(`新增聊天记录出错${err.message} ,${err.stack}`.red);
             return null;
         });
    if(data.length>0){
        return await knex((TB_SINGLE_MSG))
            .select()
            .where(`${singleMsgModel.id}`, '=', data[0])
            .timeout(TIMEOUT)
            .catch(err => {
                console.log(`查询新增聊天记录出错${err.message} ,${err.stack}`.red);
                return null;
            })
    }
    return data

}
module.exports={
    queryConversationsList,
    queryChatList,
    saveSingleMessage,
    hasMoreMessageList
}