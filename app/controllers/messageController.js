const {CODE_STATUS} = require("../../config/constants");
const {queryConversationsList} = require("../dbHelper/singleMsg");

const {getItemList} = require("../utils/util");
const {getHeaderToken} = require("../utils/util");
const router = require('koa-router')();



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

module.exports = router;