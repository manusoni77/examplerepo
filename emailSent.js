const nodemailer = require('nodemailer');
exports.sendMail = function (email,otp,req,res) {
    console.log(email);
    let mailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_SENDER,
            pass: process.env.EMAIL_SENDER_PASSWORD
        }
    });
     
    let mailDetails = {
        from: process.env.SENDER_NAME,
        to: email,
        subject: 'otp verification',
        html: `<h1>OTP Mail</h1>
               <p><div>Your OTP for verification is: <strong>${otp}</strong></div> 
               <p>Please use this OTP within the next 5 minutes to log in to your account.</p>
               <p>If you did not request this OTP, please ignore this email.</p> 
               <p>Best regards,</p></p>`
    };
     
    mailTransporter.sendMail(mailDetails, function(err, data) {
        if(err) {
            throw('Error Occurs',err.message);
        } 
    });
}
 
 
