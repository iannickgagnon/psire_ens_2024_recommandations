const fs = require('fs');
const path = require('path');

/**
 * Cleans up the progress resource by ending it and setting it to null.
 *
 * @param {Object} progressRes - The progress resource to be cleaned up.
 */
function cleanUpProgress(progressRes) {
    if (progressRes) {
        progressRes.end();
        progressRes = null;
    }
}

/**
 * Sends a progress update to the client.
 *
 * @param {number} value - The current progress value.
 * @param {string} message - A message describing the current progress.
 * @param {object} progressRes - The response object to write the progress update to.
 */
function sendProgressUpdate(value, message, progressRes) {
    if (progressRes) {
        const jsonData = JSON.stringify({ value: value, message: message });
        progressRes.write(`data: ${jsonData}\n\n`);
    }
}

/**
 * Notifies the client another response is ready.
 * 
 * @param {*} progressRes - The response object to write the progress update to.
 * @param {*} projectNumber - The project number ready with feedback.
 */
function sendFeedbackUpdate(progressRes, projectNumber) {
    if (progressRes) {
        const jsonData = JSON.stringify({ projectNumber: projectNumber });
        progressRes.write(`data: ${jsonData}\n\n`);
    }
}

/**
 * Uploads an array of files to the OpenAI API.
 *
 * @param {string[]} filePaths - An array of file paths to be uploaded.
 * @returns {Promise<string[]>} A promise that resolves to an array of uploaded file IDs.
 * @throws Will throw an error if the upload process fails.
 */
async function uploadFiles(filePaths, openai) {
    try {
        const fileIDs = [];
        for (const filePath of filePaths) {
            if (filePath) {
                const uploadedFile = await openai.files.create({
                    file: fs.createReadStream(path.resolve(filePath.path)),
                    purpose: 'assistants',
                });
                fileIDs.push(uploadedFile.id);
            }
        }
        return fileIDs;
    } catch (error) {
        console.error("Error uploading student files:", error);
        console.error("Error message :", error.message);
        console.error("Error stack :", error.stack);
        throw error;
    }
}

module.exports = { cleanUpProgress, sendProgressUpdate, sendFeedbackUpdate, uploadFiles };
