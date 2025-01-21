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

module.exports = { cleanUpProgress };
