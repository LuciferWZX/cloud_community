const knex = require('../../config/db_config');
const singleMsgModel = require("../models/singleMsg");
const userModel = require("../models/user");
const friendModal = require("../models/friend");
const {TB_FRIEND,TB_USER,TB_SINGLE_MSG} = require("./tables");
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
/**
 * 分页查询是否更多
 * @param friendId
 * @param id
 * @param page
 * @param limit
 * @returns {Promise<boolean>}
 */
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
/**
 * 保存一条消息
 * @param msgColumn
 * @returns {Promise<UnknownToAny<number>[]|TResult extends DeferredKeySelection.Any ? DeferredKeySelection.ResolveOne<TResult> : (TResult extends DeferredKeySelection.Any[] ? DeferredKeySelection.ResolveOne<TResult[0]>[] : (TResult extends infer I[] ? UnknownToAny<I>[] : UnknownToAny<TResult>))>}
 */
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
/**
 * 更具message的ids去更新消息的状态
 * @param ids
 * @returns {Promise<boolean>}
 */
const updateMessageStatusByMsgIds = async (ids)=>{
    const result = await knex.transaction(trx=>{
        const queries = [];
        ids.forEach(msgId=>{
            const query = knex(TB_SINGLE_MSG)
                .where(singleMsgModel.id,msgId)
                .update({
                    [singleMsgModel.isRead]:1
                })
                .timeout(TIMEOUT)
                .transacting(trx);
            queries.push(query);
        });
        Promise.all(queries) // Once every query is written
            .then(trx.commit) // We try to execute all of them
            .catch(trx.rollback);// And rollback in case any of them goes wrong
    })
    return result.length > 0;
}
/**
 * 根据friendId去更新消息的状态
 * @param id
 * @param ids
 * @returns {Promise<boolean>}
 */
const updateMessageStatusByFriendIds = async (id,ids)=>{
    const result = await knex.transaction(trx=>{
        const queries = [];
        ids.forEach(friendId=>{
            const query = knex(TB_SINGLE_MSG)
                .where({
                    [singleMsgModel.creatorId]:friendId,
                    [singleMsgModel.receiveId]:id,
                })
                .update({
                    [singleMsgModel.isRead]:1
                })
                .timeout(TIMEOUT)
                .transacting(trx);
            queries.push(query);
        });
        Promise.all(queries) // Once every query is written
            .then(trx.commit) // We try to execute all of them
            .catch(trx.rollback);// And rollback in case any of them goes wrong
    })
    return result.length > 0;
}
/**
 * 发送好友邀请
 * @param sendId
 * @param receiveId
 * @param desc
 * @returns {Promise<number>}
 */
const addInviteToFriend = async ({sendId,receiveId,desc})=>{
    const data = await knex(TB_FRIEND)
        .insert({
            [friendModal.sendId]:sendId,
            [friendModal.receiveId]:receiveId,
            [friendModal.desc]:desc,
        })
        .timeout(TIMEOUT)
        .catch(err => {
            console.log(`插入邀请失败${err.message} ,${err.stack}`.red);
            return null;
        })
    return data.length

}
const checkInviteMessage = async ({sendId,receiveId})=>{
    const data = await knex(TB_FRIEND)
        .select(friendModal.id)
        .where({
            [friendModal.sendId]:sendId,
            [friendModal.receiveId]:receiveId,
        })
        .whereNotIn(friendModal.inviteStatus,[1,2])
        .timeout(TIMEOUT)
        .catch(err => {
            console.log(`插入邀请失败${err.message} ,${err.stack}`.red);
            return null;
        })
    return data.length

}
module.exports={
    queryConversationsList,
    queryChatList,
    saveSingleMessage,
    hasMoreMessageList,
    updateMessageStatusByMsgIds,
    updateMessageStatusByFriendIds,
    addInviteToFriend,
    checkInviteMessage
}