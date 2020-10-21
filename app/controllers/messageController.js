

const userModel = require("../models/user");
const {hasMoreMessageList} = require("../dbHelper/singleMsg");
const {ChatType} = require("../utils/constant");
const {saveSingleMessage} = require("../dbHelper/singleMsg");
const {getItem} = require("../utils/util");
const {queryChatList} = require("../dbHelper/singleMsg");
const {TB_USER} = require("../dbHelper/tables");
const {queryFriendInfo} = require("../dbHelper/user");
const {CODE_STATUS} = require("../../config/constants");
const {queryConversationsList} = require("../dbHelper/singleMsg");

const {getItemList} = require("../utils/util");
const {getHeaderToken} = require("../utils/util");
const router = require('koa-router')();


/**
 * 根据token找到id,并更具id获取到交流列表
 */
router.get('/message/fetchConversations',async function (ctx){
    const {id} = getHeaderToken(ctx.header.authorization,'token');
    const conversationIds =await getItemList(id.concat(":conversation"));
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
module.exports = router;