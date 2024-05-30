const nodemailer = require("nodemailer");
const { welcomeTemplaceFun } = require("../templates/welcomeTemplate");

module.exports.genericMail = async (email, userName, authLink, type) => {
    const smtpEndpoint = "smtp.gmail.com";
    const port = 587;
    const senderAddress = process.env.SMTP_USERNAME;
    var toAddresses = email;

    let template;
    let subject;
    let body_text;
    if (type === "welcome") {
        template = welcomeTemplaceFun(userName, authLink)
        subject = "Welcome to Lyrics Web"
        body_text = `Please verify your account with below given Link`;
    }



    let transporter = nodemailer.createTransport({
        host: smtpEndpoint,
        port: port,
        secure: false,
        auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD
        }
    });

    let mailOptions = {
        from: senderAddress,
        to: toAddresses,
        subject: subject,
        text: body_text,
        html: template,
        headers: {}
    };

    let info = await transporter.sendMail(mailOptions)
    console.log("Message sent! Message ID: ", info.messageId);

}