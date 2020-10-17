const CODE_STATUS={
    IS_OK:200,
    IS_FAILED:100,
    IS_EXIST:201,
    NOT_EXIST:202,
    EMAIL_SEND_ERR:301,
    VERIFY_EXPIRED:302,
}
const ONLINE_STATUS={
    offline:0,//离线
    online:1,//在线
}
module.exports={
    CODE_STATUS,
    ONLINE_STATUS
}