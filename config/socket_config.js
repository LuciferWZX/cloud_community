const {removeItem,insertItem} = require("../app/utils/util");
const SOCKET_CLIENT="socket-client";
const initSocket=(io)=>{
    io.on('connect',async client=>{
        console.log(`已连接：`,client.id)
        await insertItem(SOCKET_CLIENT,client.id,client.id);
        //捕获客户端send信息
        //前端io.send(message)
        client.on('message', async function (message) {
            console.log(`message`,message)
        })

        //捕获客户端自定义信息
        //前端io.emit('xxx', message);
        client.on('toWorld', async function (message) {
            // socket.emit() ：向建立该连接的客户端广播
            // socket.broadcast.emit() ：向除去建立该连接的客户端的所有客户端广播
            // io.sockets.emit() ：向所有客户端广播，等同于上面两个的和
            io.sockets.emit('toWorld',message)
        })

        //监听客户端断开连接
        client.on('disconnect', async function () {
            await removeItem(SOCKET_CLIENT,client.id);
            console.log(`已断开：`,client.id)
        });

    })
}
module.exports={
    initSocket
}