
const otp = require("../models/otp")
const user = require("../../user/models/User");
const bcrypt = require("bcrypt");
const saltRounds = 10;
exports.verifyOtp = async (req, res) => {
    try {
        const otpObj = await otp.findOne(
            {
                $and:
                    [
                        { userId: { $eq: req.user._id } },
                        { expirationTime: { $gt: Date.now() } },
                        { otpType: { $eq: req.body.otpType } },
                        { otp: { $eq: req.body.otp } },
                    ]
            })
        if (!otpObj) {
            return res.status(404).send("Invalid otp");
        }
        otpObj.expirationTime = Date.now();
        await otpObj.save();
        if (req.body.otpType == "passwordReset") {
            const hashPassword = bcrypt.hashSync(req.body.password, saltRounds);
            await user.findOneAndUpdate(req.user._id, { $set: { password:hashPassword } });
            return res.status(200).send("Password updated successfully");
        }

        res.status(200).send("Successfully verified");
    }
    catch (error) {
        res.status(400).send({
            success: false,
            error: error.toString(),
        });
    }
} 
