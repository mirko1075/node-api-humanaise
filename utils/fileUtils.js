// utils/fileUtils.js
import { mkdirSync, createWriteStream, existsSync, rmSync } from "fs";
import archiver from "archiver";

function createOutputDir() {
    const outputDir = `output/${Date.now()}`;
    mkdirSync(outputDir, { recursive: true });
    return outputDir;
}

function zipDirectory(sourceDir, zipPath, callback) {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const output = createWriteStream(zipPath);

    output.on("close", () => callback(null));
    archive.on("error", (err) => callback(err));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
}

function cleanupFiles(paths) {
    paths.forEach((filePath) => {
        if (existsSync(filePath)) {
            rmSync(filePath, { recursive: true, force: true });
        }
    });
}

export default {
    createOutputDir,
    zipDirectory,
    cleanupFiles,
};