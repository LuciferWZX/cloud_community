
const option={
    host:"smtp.qq.com",
    secure:true,
    secureConnection:true,
    port: 465,
    auth:{
        user:"2396423791@qq.com",
        pass:"rjrmnidccmikdjfd"
    }
}
const smtpTransport = require('nodemailer-smtp-transport')(option);
module.exports =smtpTransport;