

const userModel = require("../models/user");
const {
    updateMessageStatusByFriendIds,
    updateMessageStatusByMsgIds,
    hasMoreMessageList,
    saveSingleMessage,
    queryChatList,
    addInviteToFriend,
    checkInviteMessage,
    queryConversationsList
} = require("../dbHelper/singleMsg");
const {queryFriendInfo} = require("../dbHelper/user");
const {
    getItem,
    getHeaderToken,
    getItemList
} = require("../utils/util");
const {TB_USER} = require("../dbHelper/tables");
const {CODE_STATUS} = require("../../config/constants");
const router = require('koa-router')();


/**
 * 根据token找到id,并更具id获取到交流列表
 */
router.get('/message/fetchConversations',async function (ctx){
    const {id} = getHeaderToken(ctx.header.authorization,'token');
    const conversationIds =await getItemList(id.concat(":conversation"));
    console.log(111,conversationIds)
    try {
        const data = await queryConversationsList(id,conversationIds);
        const result = data.flat();
        return ctx.body={
            code:CODE_STATUS.IS_OK,
            data:result.map(item=>{
                return {
                    nickname:item.nickname,
                    friendId:item.friendId,
                    content:item.content,
                    avatar:item.avatar,
                    unRead:item.unRead,
                    type:item.type,
                    createDate:item.create_time
                }
            }),
            message:"获取成功"
        }
    }catch (e){
        return ctx.body={
            code:CODE_STATUS.IS_FAILED,
            data:null,
            message:"获取失败"
        }
    }

})
/**
 * 更具好友id查询好友的状态和消息列表
 */
router.get('/message/friendChatData',async function (ctx){
    const {friendId,id}=ctx.request.query;
    try {
        const friendInfo =await queryFriendInfo({
            useColumn:[
                `${TB_USER}.${userModel.id}`,
                `${TB_USER}.${userModel.nickname}`,
                `${TB_USER}.${userModel.avatar}`
            ],
            friendId:friendId
        });
        const chatList = await queryChatList({
            friendId:friendId,
            id:id,
        });
        const hasMore = await hasMoreMessageList({
            friendId:friendId,
            id:id,
        });
        const SOCKET_CLIENT="socket-client";
        const friendSocketInfo = await getItem(SOCKET_CLIENT,friendId);
        return ctx.body={
            code:CODE_STATUS.IS_OK,
            data: {
                ...friendInfo,
                chatList:chatList.reverse(),
                hasMore:hasMore,
                inputValue:"",
                onlineStatus:friendSocketInfo&&friendSocketInfo.status||0
            },
            message:"获取成功"
        }
    }catch (e){
        return ctx.body={
            code:CODE_STATUS.IS_FAILED,
            data: null,
            message:"获取聊天列表失败"
        }
    }

})
/**
 * 发送文字信息
 */
router.post('/message/sendMsg',async function (ctx){
    const {message,type,creatorId,receiveId}=ctx.request.body;
    const data = await saveSingleMessage({
        creatorId,
        receiveId,
        contentType: type,
        content:message
    })
    //console.log(99,data[0]);
    if(data.length>0){
        //通知对方来了新的消息
        global._socket.emit("receive-new-message",JSON.stringify(data[0]))
        return ctx.body={
            code:CODE_STATUS.IS_OK,
            data: data[0],
            message:"保存成功"
        }
    }
    return ctx.body={
        code:CODE_STATUS.IS_FAILED,
        data: null,
        message:"保存失败"
    }
})
/**
 * 更新消息的状态为已读
 */
router.post('/message/updateMessages',async function (ctx){
    const {receiveId,dependFriendId,ids}=ctx.request.body;
    if(dependFriendId){
        try{
            const result =await updateMessageStatusByFriendIds(receiveId,ids);
            if(result){
                return ctx.body={
                    code:CODE_STATUS.IS_OK,
                    data: null,
                    message:"更新成功"
                }
            }
            return ctx.body={
                code:CODE_STATUS.IS_FAILED,
                data: null,
                message:"更新失败"
            }
        }catch (e){
            return ctx.body={
                code:CODE_STATUS.IS_FAILED,
                data: null,
                message:"sql异常"
            }
        }
    }else{
        try{
            const result =await updateMessageStatusByMsgIds(ids);
            if(result){
                window._socket.emit("message-is-read-singleIds",JSON.stringify({
                    receiveId,
                    ids
                }))
                return ctx.body={
                    code:CODE_STATUS.IS_OK,
                    data: null,
                    message:"更新成功"
                }
            }
            return ctx.body={
                code:CODE_STATUS.IS_FAILED,
                data: null,
                message:"更新失败"
            }
        }catch (e){
            return ctx.body={
                code:CODE_STATUS.IS_FAILED,
                data: null,
                message:"sql异常"
            }
        }

    }
})
/**
 * 发送好友邀请
 */
router.post('/message/sendInviteMessage',async function (ctx){
    const {id} = getHeaderToken(ctx.header.authorization,'token');
    const {desc,fid}=ctx.request.body;
    try {
        const alreadySend = await checkInviteMessage({
            sendId:id,
            receiveId:fid
        })
        if(alreadySend){
            return ctx.body={
                code:CODE_STATUS.IS_FAILED,
                data: null,
                message:"已发送过邀请，请等待回复"
            }
        }
        const data =await addInviteToFriend({
            desc,
            sendId:id,
            receiveId:fid
        });
        if(data){
            return ctx.body={
                code:CODE_STATUS.IS_OK,
                data: null,
                message:"邀请以及发送，请等待对方通过"
            }
        }
        return ctx.body={
            code:CODE_STATUS.IS_FAILED,
            data: null,
            message:"邀请发送失败"
        }
    }catch (e){
        return ctx.body={
            code:CODE_STATUS.IS_FAILED,
            data: null,
            message:e.toString()
        }
    }
})
module.exports = router;