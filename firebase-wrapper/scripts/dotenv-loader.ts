import dotenv from "dotenv";

interface ProcessEnv {
    [key: string]: string | undefined;
}

// get cli args
const args: string[] = process.argv.slice(2); // skip "node" and script name
if (args.length === 0) {
    console.error("Error: You must provide an environment variable to fetch");
    process.exit(1);
}

dotenv.config();

const envVariableName: string = args[0];
const env: ProcessEnv = process.env;

const envValue: string | undefined = env[envVariableName];

if (envValue === undefined) {
    console.error(
        `Error: Environment variable "${envVariableName}" does not exist.`,
    );
    process.exit(1);
}

console.log(envValue);
