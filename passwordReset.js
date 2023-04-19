const {UserModal} = require("../models/index");
const {getOtp} = require("../../otp/controllers/getOtp");
const logger = require("../../../utils/logger");
const { sendMail } = require("../../sendEmail/controllers/emailSent");


module.exports = async (req, res) => {
	try {
		const {email,otpType} = req.body;
        const userExist = await UserModal.findOne({email});
		console.log(userExist);
        const otp = await getOtp(userExist._id,otpType);
		await sendMail(email,otp)
		const authToken = await userExist.getAuthToken();
        res.status(200).send({success:true,authToken});
	} catch (error) {
		res.status(400).send({
			success: false,
			error: error.toString(),
		});
	}
};