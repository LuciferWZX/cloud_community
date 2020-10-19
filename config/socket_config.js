const {getItem} = require("../app/utils/util");
const {ONLINE_STATUS} = require("./constants");
const {removeItem,insertItem} = require("../app/utils/util");
const SOCKET_CLIENT="socket-client";
const initSocket=(io)=>{
    console.log("socket已准备")
    io.on('connect',async client=>{
        console.log(`已连接：`,client.handshake.query.uid)
        const {uid}=client.handshake.query
        //如果查得到data说明在redis里面，查不到说明第一次登录
        let data = await getItem(SOCKET_CLIENT,uid);
        if(!data){
            //没有查到，就差入到redis里面
            await insertItem(SOCKET_CLIENT,uid, {
                id:uid,
                status:ONLINE_STATUS.online
            });
            data={
                id:uid,
                status:ONLINE_STATUS.online
            }
        }else{
            data = {
                id:uid,
                status:data.status
            };
        }
        //发送到客户端，提示更新状态（update-online-status）
        io.emit("user-channel",JSON.stringify({
            actionType:'update-online-status',
            response:{
                code:200,
                data:data,
                message:"获取到在线状态"
            }
        }));
        //捕获客户端send信息
        //前端io.send(message)
        client.on('message', async function (message) {
            console.log(`message`,message)
        })

        //捕获客户端自定义信息
        //前端io.emit('xxx', message);
        client.on('force-logout', async function (data) {
            // socket.emit() ：向建立该连接的客户端广播
            // socket.broadcast.emit() ：向除去建立该连接的客户端的所有客户端广播
            //client.broadcast.emit('user-channel',data);
            // io.sockets.emit() ：向所有客户端广播，等同于上面两个的和
            //io.sockets.emit('toWorld',message)
        })

        //监听客户端断开连接
        client.on('disconnect', async function () {
            const {uid}=client.handshake.query
            await removeItem(SOCKET_CLIENT,uid);
            const data = {
                id:uid,
                status:ONLINE_STATUS.offline
            };
            //断开发送到客户端，提示更新好友状态（update-online-status）
            // io.emit("user-channel",JSON.stringify({
            //     actionType:'update-online-status',
            //     response:{
            //         code:200,
            //         data:data,
            //         message:"获取到在线状态"
            //     }
            // }));
            console.log(`已断开：`,client.id)
        });

    });
    global._socket=io;
}

module.exports={
    initSocket
}