const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({

    host: "smtp.gmail.com",
    port: 587,
    secure: false,

    auth: {

        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS

    }

});


const sendMail = async (
    email,
    subject,
    text
)=>{

    try{

        const info = await transporter.sendMail({

            from: process.env.EMAIL_USER,

            to: email,

            subject: subject,

            text: text

        });

        console.log(
            "Mail sent:",
            info.messageId
        );

    }
    catch(error){

        console.log(error.message);

    }

}

module.exports = sendMail;