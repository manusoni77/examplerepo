const {getOtp} = require("../../otp/controllers/getOtp");
const {UserModal} = require("../models/index");
const logger = require("../../../utils/logger");
const { sendMail } = require("../../sendEmail/controllers/emailSent");

module.exports = async (req, res) => {
	try {
		const {email, phoneNo, firstName, lastName, company, password, confirmPassword} =
			req.body;

		let user = {
			email,
			phoneNo,
			firstName,
			lastName,
			company,
			password,
			confirmPassword,
		};

		const sameUserExist = await UserModal.exists({email});
		if (sameUserExist) throw Error(`User with email (${email}) already exist.`);
		const newUser = await new UserModal(user).save();
		console.log("user:",user,"newUser:",newUser);
		newUser.password = undefined;

		const authToken = newUser.getAuthToken();
        const otp = await getOtp(newUser._id,req.body.otpType);
		sendMail(req.body.email,otp)	
		res.status(200).send({
			success: true,
			user: newUser,
			authToken,
			message: "Registered successfully",
		});
	} catch (error) {
		if (newUser._id) {
			await  UserModal.deleteOne({_id:newUser._id});
		}
		res.status(400).send({
			success: false,
			error: error.toString(),
		});
	}
};
