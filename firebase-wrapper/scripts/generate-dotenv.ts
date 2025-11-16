import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

type TdotenvFiles = (typeof dotenvFiles)[keyof typeof dotenvFiles];

const dotenvFiles = {
    base: ".env",
    dev: ".env.development",
} as const;

const allowedDotEnvTypes = [String, Number, Boolean] as const;
const defaultDotEnvTypeUpper: string = "STRING";

const dotEnvTypeNames: string[] = allowedDotEnvTypes.map((type_) => type_.name);
const regexKeyEmbeddedType = getRegexFromDotEnvTypes(dotEnvTypeNames);

// something like: string | number
type AllowedDotEnvTypes = (typeof allowedDotEnvTypes)[number] extends new (
    ...args: any[]
) => infer ReturnType
    ? ReturnType
    : never;

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

const typedDotEnvConfig: Record<string, AllowedDotEnvTypes> =
    getTypedDotEnv(mergedDotEnvConfig);

const dotenvTsContent = `export type TProcessEnv {
${dotenv2TsTypes(typedDotEnvConfig)}
}
export const env: TProcessEnv = ${JSON.stringify(typedDotEnvConfig, null, 4)};
`;

const outputFile: string = "./src/dotenv.ts";
fs.writeFileSync(outputFile, dotenvTsContent, "utf8");
console.log(`${outputFile} has been generated.`);
if (process.env.NODE_ENV === "development") {
    console.log(`
!!!!!
!!!!! BE CAREFUL NOT TO COMMIT THE DEVELOPMENT VALUES TO GIT!
!!!!!`);
}

// functions

/** the types of the variable are stored on the end of the .env key.
 * eg. MY_VAR_NUMBER */
function getRegexFromDotEnvTypes(allowedDotEnvTypes: string[]): RegExp {
    const typesAsString: string = allowedDotEnvTypes
        .map((typeName: string) => typeName.toUpperCase())
        .join("|");

    return new RegExp(`_(${typesAsString})$`);
}

function loadDotEnvFile(
    dotenvFile: TdotenvFiles,
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

function getTypedDotEnv(
    parsedDotenvVars: NodeJS.ProcessEnv,
): Record<string, AllowedDotEnvTypes> {
    return Object.keys(parsedDotenvVars).reduce<
        Record<string, AllowedDotEnvTypes>
    >((acc, key) => {
        const { updatedKey, keyTypeNameUpper } = extractTypeFromKey(key);
        switch (keyTypeNameUpper) {
            case "BOOLEAN":
                acc[updatedKey] = getBoolean(key, parsedDotenvVars[key]);
                break;
            case "NUMBER":
                acc[updatedKey] = getNumber(key, parsedDotenvVars[key]);
                break;
            case "STRING":
                acc[updatedKey] = parsedDotenvVars[key]!;
                break;
            default:
                throw new Error(
                    `Type ${keyTypeNameUpper} is not supported ` +
                        `(from .env var ${key})`,
                );
        }
        return acc;
    }, {});
}

function extractTypeFromKey(key: string): {
    updatedKey: string;
    keyTypeNameUpper: string;
} {
    const capturedGroups: RegExpExecArray | null =
        regexKeyEmbeddedType.exec(key);

    const keyTypeNameUpper: string =
        capturedGroups === null ? defaultDotEnvTypeUpper : capturedGroups[1];

    const updatedKey = key.replace(regexKeyEmbeddedType, "");

    return { updatedKey, keyTypeNameUpper };
}

function getBoolean(
    dotEnvKey: string,
    dotEnvValue: string | undefined,
): boolean {
    if (dotEnvValue?.toLowerCase() === "true") return true;
    if (dotEnvValue?.toLowerCase() === "false") return false;
    throw new Error(`Value for ${dotEnvKey} must be "true" or "false"`);
}

function getNumber(dotEnvKey: string, dotEnvValue: string | undefined): number {
    const errorMessage = `Value for ${dotEnvKey} must be a number`;
    if (dotEnvValue === undefined) throw new Error(errorMessage);
    const parsedNumber = Number(dotEnvValue);
    if (
        isNaN(parsedNumber) ||
        parsedNumber === Infinity ||
        parsedNumber === -Infinity
    ) {
        throw new Error(errorMessage);
    }
    return parsedNumber;
}

function dotenv2TsTypes(
    parsedDotenvVars: Record<string, AllowedDotEnvTypes>,
): string {
    const tab: string = "    ";

    const processEnvTypes = Object.keys(parsedDotenvVars)
        .map((key: string) => `${tab}${key}: ${typeof parsedDotenvVars[key]};`)
        .join("\n");

    return processEnvTypes;
}
