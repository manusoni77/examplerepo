const {getOtp} = require("../../otp/controllers/getOtp");
const {UserModal} = require("../models/index");
const otpModal = require("../../otp/models/otp")
const { sendMail } = require("../../sendEmail/controllers/emailSent");

module.exports = async (req, res) => {
	let newUser;
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
		
		const otpType = "signUp";
		const sameUserExist = await UserModal.findOne({email});
		if (sameUserExist){
			if (sameUserExist.isVerified) {
				throw Error(`User with email (${email}) already exist.`)
			} 
			else{
				await otpModal.deleteOne({ userId: sameUserExist._id ,otpType})
				await  UserModal.deleteOne({_id:sameUserExist._id});
			}	
		} 
		newUser = await new UserModal(user).save();
		newUser.password = undefined;
		const authToken = newUser.getAuthToken();
        const otp = await getOtp(newUser._id,otpType);
		await sendMail(req.body.email,otp);	
		res.status(200).send({
			success: true,
			user: newUser,
			authToken,
			message: "Registered successfully",
			otpType: otpType
		});
		} 
	catch (error) {
		res.status(400).send({
			success: false,
			error: error.toString(),
		});
		}
};
