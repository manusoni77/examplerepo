const path = require("path");
const fs = require("fs");

const { ProjectModal } = require("../../project/models/index");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const basePath = require("../../../../getBasePath");
const parseRenderxOutput = require("../../../utils/parseRenderxOutput");
const { default: mongoose } = require("mongoose");
const logger = require("../../../utils/logger");

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
    });

    // Get the project details. 
    const project = await ProjectModal.findById(projectId);

    // extract the current redering index
    const renderIdx = project.renders.findIndex((r) => r._id == renderId);
    const renderLog = {};
    try {
      const renderingStartTime = +new Date();

      const { stderr, stdout } = await exec(
        `${absolutePath} ${absolutePathForFile}`
      );
      const renderFinishTime = +new Date() - renderingStartTime;

      renderLog.stderr = stderr;
      renderLog.stdout = stdout;

      logger.info(`RenderX Result`);
      logger.info(stderr);
      logger.info(stdout);
      if (stderr) {
        logger.info(`Standard error details`);
        logger.info(stderr);

      } else {
        const { warnings, errors } = parseRenderxOutput(stdout);
        renderLog.warnings = warnings;
        renderLog.errors = errors;
        if (errors.length > 0) {
          logger.error("Error in generating video");
          logger.error(errors);
        } else {
          project.renders[renderIdx]["isVideoGenerated"] = true;
          project.renders[renderIdx]["videoRenderTimeInMs"] = renderFinishTime;
          logger.info(`Video generated for project ${projectId} with renderId ${renderId}`);
        }
      }
    } catch (err) {
      renderLog.catchErrorMessage = err.message;
      logger.error(err);
    } finally {
      project.renders[renderIdx]["renderErrorMessage"] = JSON.stringify(renderLog);
      project.renders[renderIdx]["isRederFinished"] = true;
      await project.save();
    }
  } catch (error) {
    res.status(400).send({
      success: false,
      error: error.toString(),
    });
  }
};