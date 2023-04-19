const nodemailer = require('nodemailer');
const  {google} = require('googleapis');

const OAuth2 = google.auth.OAuth2
const OAuth2_client = new OAuth2("207198304016-3bdf27ts36531ofma47kb23bhm0ii357.apps.googleusercontent.com","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")
OAuth2_client.setCredentials({refresh_token:"1//04SzJCw-Nc_SfCgYIARAAGAQSNwF-L9Irv4hCKu7llUGLmZwLbLmU31VgfXmNOnTBkQo3mj0QcK_LIvERjUZKBVvEpk-74ODhca4"})
exports.sendMail = async function (email,messageString) {
    const accessToken = await OAuth2_client.getAccessToken()
    let mailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: "credits@scrollx.io",
            accessToken: accessToken.token
        }
    });
     
    let mailDetails = {
        from: 'Credits',
        to: email,
        subject: 'Render Verification',
        html: `<h1>${messageString}</h1>`
    };
     
    mailTransporter.sendMail(mailDetails, function(err, data) {
        if(err) {
            throw('Error Occurs',err.message);
        } 
    });
}
 
 

 
 
