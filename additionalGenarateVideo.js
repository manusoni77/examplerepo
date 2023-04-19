const path = require("path");
const fs = require("fs");
const { ProjectModal } = require("../../project/models/index");
const { UserModal }  = require("../../user/models/index")
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const basePath = require("../../../../getBasePath");
const parseRenderxOutput = require("../../../utils/parseRenderxOutput");
const { default: mongoose } = require("mongoose");
const logger = require("../../../utils/logger");
const { sendMail } = require("../../sendEmail/controllers/renderEmail");

const {
  outputH264,
  outputProResProxy,
  outputProRes422Hq,
  outputProRes422Lt,
  outputProRes422Std,
  outputProRes4444,
  outputProRes4444Xq,
} = require("../../../utils/renderXSettings");

function getOutputResolution(format) {
  const resolutions = {
    outputH264,
    outputProResProxy,
    outputProRes422Hq,
    outputProRes422Lt,
    outputProRes422Std,
    outputProRes4444,
    outputProRes4444Xq,
  };
  logger.info(`Resolution type ${format}`);
  return resolutions[format]
}

module.exports = async (req, res) => {
  try{
    const project = await ProjectModal.findOne({_id:req.params.projectId},{_id:0,'members.userId' :1});
    const user = await UserModal.findOne({_id:project.members[0].userId})
    const email = user.email;
    try {
      const { renderId, projectId } = req.params;
      const {
        videoHeight,
        videoWidth,
        scrollPixelPerFrame,
        fpsDenominator,
        fpsNumerator,
        format,
        aspectRatio,
        isEmailSend,
        isEmailSendtoAll
      } = req.body;
      const isEmailSendValue = JSON.parse(isEmailSend);
      logger.info(`format ${format} isEmailSend ${isEmailSend} isEmailSendtoAll ${isEmailSendtoAll}`);
      const projectData = await ProjectModal.findByIdAndUpdate(projectId, {
        $push: {
          renders: {
            videoHeight,
            videoWidth,
            scrollPixelPerFrame,
            fpsDenominator,
            fpsNumerator,
            format,
            aspectRatio,
            isEmailSend,
            isEmailSendtoAll,
            _id: mongoose.Types.ObjectId(renderId),
            isVideoGenerated: false,
          },
        },
      }, { new: true, fields: { renders: 1 } });
      let jsonData = JSON.parse(JSON.stringify(getOutputResolution(format)));
      logger.info(`Configuration JSON: ${JSON.stringify(jsonData)}`);
      const imageDir = path.join(
        basePath,
        "uploads",
        projectId,
        renderId,
        "images"
        );
      
      // This collater will compare the file name with numeric values and properly sort the 
      // string with numbers 
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
      const imageNames = fs.readdirSync(imageDir).sort(collator.compare);
      
      const imagePaths = imageNames.map((name) =>
      path.join(basePath, "uploads", projectId, renderId, "images", name)
      );
      const videoPath = path.join(
        basePath,
        "uploads",
        projectId,
        renderId,
        "preview.mov"
        );
        
        jsonData = {
          ...jsonData,
          video_height: parseInt(videoHeight, 10),
          video_width: parseInt(videoWidth, 10),
          scroll_pixel_per_frame: parseInt(scrollPixelPerFrame, 10),
          fps_numerator: parseInt(fpsNumerator, 10),
          fps_denominator: parseInt(fpsDenominator, 10),
          output_filename: videoPath,
          png_filename: imagePaths,
        };
        const jsonContent = JSON.stringify(jsonData);
        logger.info(`Json Content for the RenderX ${jsonContent}`);
      
        const absolutePathForFile = path.join(
          basePath,
          "uploads",
          projectId,
          renderId,
          "output.json"
        );
      logger.info(`Absolute path for the file ${absolutePathForFile}`);
      const absolutePath = path.join(basePath, "RenderX2");

      logger.info(`RenderX path final ${absolutePath}`);
      fs.writeFileSync(absolutePathForFile, jsonContent, "utf8");
    
      res.json({
        success: true,
        renders: projectData.renders,
        message:
          "Video requested successfully, Please check back after sometime.",
      })

      try {
        let renderIsSuccessful = false;
        const { stderr, stdout } = await exec(
          `${absolutePath} ${absolutePathForFile}`
        );
        logger.info(`RenderX Result`);
        logger.info(stderr);
        logger.info(stdout);
        if (stderr) {
          logger.info(`Standard error details`);
          logger.info(stderr);
  
        } else {
          const { warnings, errors } = parseRenderxOutput(stdout);
          if (errors.length > 0) {
            logger.error("Error in generating video");
            logger.error(errors);
          }
          else {
            const project = await ProjectModal.findById(projectId);
            const renderIdx = project.renders.findIndex((r) => r._id == renderId);
            project.renders[renderIdx]["isVideoGenerated"] = true;
            await project.save();
            renderIsSuccessful = true;
            logger.info(
              `Video generated for project ${projectId} with renderId ${renderId}`
            );
          }
          if(isEmailSendValue){
            if(renderIsSuccessful){
              await sendMail(email,"Render is completed")
            }
            else{
              await sendMail(email,"Something went wrong. Please try again")
            }
          }
        }
      } catch (err) {
        // todo: store error
        console.log(err);
      }
    } catch (error) {    
      res.status(400).send({
        success: false,
        error: error.toString(),
      });
    }
  }
  catch(error){
    res.status(400).send({
      success: false,
      error: error.toString(),
    });
  }
}
  