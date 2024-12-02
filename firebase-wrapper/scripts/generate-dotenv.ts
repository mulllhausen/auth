import * as fs from "fs";
import * as dotenv from "dotenv";
import * as path from "path";

enum dotenvFiles {
    base = ".env",
    dev = ".env.development",
}
const typeFieldPostfix: string = "_TYPE";

const mustBePopulated: boolean = true;
const baseDotenvConfig: dotenv.DotenvParseOutput | undefined = loadDotEnvFile(
    dotenvFiles.base,
    mustBePopulated,
);

let mergedDotEnvConfig: dotenv.DotenvParseOutput = baseDotenvConfig!;

if (process.env.NODE_ENV === "development") {
    const devDotenvConfig: dotenv.DotenvParseOutput | undefined =
        loadDotEnvFile(dotenvFiles.dev);

    mergedDotEnvConfig = mergeDotEnvConfigs(
        mergedDotEnvConfig,
        devDotenvConfig,
    );
}

const typedDotEnvConfig: Record<string, string | number> =
    getTypedDotEnv(mergedDotEnvConfig);

const dotenvTsContent = `export interface ProcessEnv {
${dotenv2Types(mergedDotEnvConfig)}
}
export const env: ProcessEnv = ${JSON.stringify(typedDotEnvConfig, null, 4)};
`;

const outputFile: string = "./src/dotenv.ts";
fs.writeFileSync(outputFile, dotenvTsContent, "utf8");
console.log(`${outputFile} has been generated.`);
if (process.env.NODE_ENV === "development") {
    console.log(
        `!!!!!
!!!!! BE CAREFUL NOT TO COMMIT THE DEVELOPMENT VALUES TO GIT!
!!!!!`,
    );
}

function loadDotEnvFile(
    dotenvFile: dotenvFiles,
    mustBePopulated: boolean = false,
): dotenv.DotenvParseOutput | undefined {
    const dotEnvFilePath: string = path.resolve(process.cwd(), dotenvFile);

    if (!fs.existsSync(dotEnvFilePath)) {
        console.log(
            `unable to load ${dotenvFile}. file not found at ${dotEnvFilePath}`,
        );
        return;
    }

    const dotenvConfig: dotenv.DotenvConfigOutput = dotenv.config({
        path: dotEnvFilePath,
    });

    if (dotenvConfig.error) {
        console.error(
            `Error parsing ${dotenvFile} file:`,
            dotenvConfig.error.message,
        );
        process.exit(1);
    }

    const parsedDotenvVars: dotenv.DotenvParseOutput | undefined =
        dotenvConfig.parsed;
    if (mustBePopulated && parsedDotenvVars === undefined) {
        console.error(`Error parsing ${dotenvFile} file: no variables found`);
        process.exit(1);
    }
    return parsedDotenvVars;
}

/** later config args overwrite earlier config args */
function mergeDotEnvConfigs(
    ...dotEnvConfigs: (dotenv.DotenvParseOutput | undefined)[]
): dotenv.DotenvParseOutput {
    return dotEnvConfigs.reduce(
        (previous, current) =>
            current === undefined ? previous : { ...previous, ...current },
        {},
    )!;
}

function dotenv2Types(parsedDotenvVars: NodeJS.ProcessEnv): string {
    const tab: string = "    ";
    return Object.keys(parsedDotenvVars)
        .filter((key: string) => !key.endsWith(typeFieldPostfix))
        .map(
            (key: string) => `${tab}${key}: ${getType(parsedDotenvVars, key)};`,
        )
        .join("\n");
}

function getTypedDotEnv(
    parsedDotenvVars: NodeJS.ProcessEnv,
): Record<string, string | number> {
    return Object.keys(parsedDotenvVars)
        .filter((key: string) => !key.endsWith(typeFieldPostfix))
        .reduce<Record<string, string | number>>((acc, key) => {
            const typeAsString: string = getType(parsedDotenvVars, key);
            switch (typeAsString) {
                case "number":
                    acc[key] = Number(parsedDotenvVars[key]);
                    break;
                default:
                    acc[key] = parsedDotenvVars[key]!;
                    break;
            }
            return acc;
        }, {});
}

function getType(parsedDotenvVars: NodeJS.ProcessEnv, key: string): string {
    if (parsedDotenvVars.hasOwnProperty(`${key}${typeFieldPostfix}`)) {
        return parsedDotenvVars[`${key}${typeFieldPostfix}`]!;
    }
    return "string";
}
