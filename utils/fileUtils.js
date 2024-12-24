// utils/fileUtils.js
const fs = require("fs");
const archiver = require("archiver");

function createOutputDir() {
    const outputDir = `output/${Date.now()}`;
    fs.mkdirSync(outputDir, { recursive: true });
    return outputDir;
}

function zipDirectory(sourceDir, zipPath, callback) {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const output = fs.createWriteStream(zipPath);

    output.on("close", () => callback(null));
    archive.on("error", (err) => callback(err));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
}

function cleanupFiles(paths) {
    paths.forEach((filePath) => {
        if (fs.existsSync(filePath)) {
            fs.rmSync(filePath, { recursive: true, force: true });
        }
    });
}

module.exports = {
    createOutputDir,
    zipDirectory,
    cleanupFiles,
};