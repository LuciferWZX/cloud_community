const knex = require('../../config/db_config');
const singleMsgModel = require("../models/singleMsg");
const userModel = require("../models/user");
const {TB_AUTH,TB_USER,TB_SINGLE_MSG} = require("./tables");
const TIMEOUT = 1000;
/**
 * 更具redis里面的个人conversations记录查询对方聊天信息状态
 * @param userIds
 * @returns {Promise<unknown>}
 */
const queryConversationsList=async (uId,userIds)=>{
    return knex.transaction(trx => {
        const queries = [];
        userIds.forEach(id=>{
            const query = knex(TB_SINGLE_MSG)
                .where(function (){
                    this.where(singleMsgModel.creatorId, id).orWhere(singleMsgModel.receiveId, id);
                })
                .andWhere(function (){
                    this.where(`${TB_USER}.${userModel.id}`, '=', id)
                })
                .andWhere(singleMsgModel.isDeleted, '!=', 1)
                .column(
                    `${TB_SINGLE_MSG}.${singleMsgModel.id}`,
                   `${TB_SINGLE_MSG}.${singleMsgModel.createTime}`,
                    `${TB_SINGLE_MSG}.${singleMsgModel.content}`,
                    `${TB_SINGLE_MSG}.${singleMsgModel.contentType} as type`,
                    `${TB_USER}.${userModel.avatar}`,
                    `${TB_USER}.${userModel.nickname}`,
                    `${TB_SINGLE_MSG}.${singleMsgModel.creatorId} as friendId`,
                    {
                        unRead:knex.raw(
                            `(select count(*) from ${TB_SINGLE_MSG} where ${singleMsgModel.receiveId} = ${uId} and  ${singleMsgModel.creatorId} = ${id}  and ${singleMsgModel.isRead}=0)`
                        )
                    }
                )
                .select()
                .orderBy(singleMsgModel.createTime, "desc")
                .join(TB_USER, function() {
                    this.on(
                        `${TB_SINGLE_MSG}.${singleMsgModel.creatorId}`,
                        '=',
                        `${TB_USER}.${userModel.id}`
                    ).orOn(
                        `${TB_SINGLE_MSG}.${singleMsgModel.receiveId}`,
                        '=',
                        `${TB_USER}.${userModel.id}`
                    )
                })
                .timeout(TIMEOUT)
                .limit(1)
                .transacting(trx);
            queries.push(query);
        })

        Promise.all(queries)// Once every query is written
            .then(trx.commit)// We try to execute all of them
            .catch(trx.rollback)// And rollback in case any of them goes wrong
    });
}
module.exports={
    queryConversationsList
}