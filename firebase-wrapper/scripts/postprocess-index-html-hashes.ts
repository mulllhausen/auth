import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// loop over the <script> files referenced in index.html
// calculate the hash for each file
// add a querystring to each file in index.html

const distDir: string = path.resolve("dist/");
const indexPath: string = path.join(distDir, "index.html");
let indexHTML: string = fs.readFileSync(indexPath, "utf-8");

indexHTML = indexHTML.replace(
    /<(script[^>]*)src="([^?\r\n"]+)[^"]*"([\s\S]*)><\/script>/g,
    (
        match: string,
        scriptTagEtc: string,
        filePathAndName: string,
        moreScriptProperties: string,
    ) => {
        const scriptFilePath: string = mergeFilePaths(distDir, filePathAndName);
        if (!fs.existsSync(scriptFilePath)) {
            console.warn(
                `<script> file not found: ${scriptFilePath}. ` +
                    `No querystring hash added.`,
            );
            return match;
        }
        const hash: string = calculateFileHash(scriptFilePath);
        return (
            `<${scriptTagEtc}` +
            `src="${filePathAndName}?hash=${hash}"` +
            `${moreScriptProperties}>` +
            `</script>`
        );
    },
);

fs.writeFileSync(indexPath, indexHTML, "utf-8");
console.log("Updated index.html with query-string hashes.");

/** merge path1 and path2 without duplicated dirs in the middle
 * @example path1 = "/abc/def/ghi", path2 = "/def/ghi/jkl.js",
 * returns "/abc/def/ghi/jkl.js"
 */
function mergeFilePaths(path1: string, path2: string): string {
    // shortcut for now. may not work in furure?
    return path.join(path1, path2.replace(process.env.BASE_PATH!, ""));

    path1 = path.normalize(path1);
    path2 = path.normalize(path2);
    let path2SoFar: string = "";
    for (let i = 0; i < path2.length; i++) {
        path2SoFar += path2[i];
        if (!path1.endsWith(path2SoFar)) continue;
        path2 = path2.replace(path2SoFar, "");
        break;
    }
    return path.join(path1, path2);
}

function calculateFileHash(filePath: string): string {
    const fileContents = fs.readFileSync(filePath);
    return crypto
        .createHash("sha256")
        .update(fileContents)
        .digest()
        .toString("base64")
        .slice(0, 6);
}
