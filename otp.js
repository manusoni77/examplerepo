
const otp = require("../models/otp")

exports.verifyOtp= async (req,res)=>{
    try{
       const  otpObj =await otp.find(
        { $and:
             [ 
                { user_id: { $eq: req.user._id } },
                 { expiration_time: { $gt:Date.now()}}, 
                 {otpType:{$eq:req.body.type}
                } 
             ] 
         } )
         console.log(otpObj)
        if (!otpObj[0]) {
            return res.status(404).send("Invalid otp");
        }
        res.status(200).send("Successfully verified")
    }
    catch(error){
        logger.error(error)
        res.status(400).send({
			success: false,
			error: error.toString(),
		});
    }
} 


// exports.verifyOtp= async (req,res)=>{
//     try{
//         const otpObj = await otp.findOne({user_id:req.user._id})
//     //    const  otpObj =await otp.find({ $and: [ { user_id: { $eq: req.user._id } }, { expiration_time: { $gt:Date.now()  } } ] } )
//        console.log("otp object is here b", otpObj);
//        console.log(req.body.otpType);
//         if (!otpObj) {
//             return res.status(404).send("Invalid otp");
//         }
//         if (otpObj.otp==req.body.otp && Date.now() < otpObj.expiration_time && otpObj.otpType == req.body.otpType) {
//         await otp.deleteOne({user_id:req.user._id}) 
//         res.status(200).send("Successfully verified")
//     }
//         else{
//             res.status(404).send("Invalid otp");
//         }
//     }
//     catch(error){
//         res.status(400).send({
// 			success: false,
// 			error: error.toString(),
// 		});
//     }
// } 
    
