// this file was recommended as a workaround by the nodejs runtime to load
// typescript files as node modules.
// so instead of putting "node --loader ts-node/esm thefile.ts" in the package.json
// we put "node --import loader.mjs thefile.ts"

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("ts-node/esm", pathToFileURL("./"));
