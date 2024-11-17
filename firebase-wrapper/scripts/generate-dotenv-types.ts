import * as fs from "fs";
import * as dotenv from "dotenv";

const dotenvConfig: dotenv.DotenvConfigOutput = dotenv.config();

if (dotenvConfig.error) {
    console.error("Error loading .env file:", dotenvConfig.error.message);
    process.exit(1);
}

const env: dotenv.DotenvParseOutput | undefined = dotenvConfig.parsed;

if (!env) {
    console.error("No .env file found or it is empty.");
    process.exit(1);
}

const dotenvDTsContent = `/// <reference types="node" />

declare namespace NodeJS {
    interface ProcessEnv {
${dotenv2Types(env)}
    }
}

export {};
`;

fs.writeFileSync(".env.d.ts", dotenvDTsContent, "utf8");
console.log(".env.d.ts has been generated.");

function dotenv2Types(parsedDotenvVars: dotenv.DotenvParseOutput): string {
    return Object.keys(parsedDotenvVars)
        .map((key) => `        ${key}: string;`)
        .join("\n")
}