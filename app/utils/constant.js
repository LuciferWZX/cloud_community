//聊天的枚举类型
const ChatType = Object.freeze({
    single:0,//单人一对一聊天
    multi:1//群聊聊天
})
//发送信息的枚举类型
const MessageType = Object.freeze({
    text:0,
    pic:1,
    video:2,
    excel:3,
    word:4,
    pdf:5,
    others:6,
})
module.exports = {
    ChatType,
    MessageType,
}