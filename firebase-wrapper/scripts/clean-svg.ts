import fs from "fs";
import { JSDOM } from "jsdom";

// 1. create the finite state machine flowchart in excalidraw.
// 2. export it as svg.
// 3. use this script to clean the svg file, add css classes and
//    generate typescript types.
// the gui can then interact with it.

const inputSVGFile: string = "./public/images/fsm-email-link3.svg";
const outputSVGFile: string = "./public/images/fsm-email-link3-cleaned.svg";
const outputSVGTypesFile: string = "./src/svg-types.ts";
const TAB = "    ";

// init
const duplicateClasses: Map<string, string[]> = new Map([
    ["arrow", []],
    ["state-box", []],
]);

const svgData: string = fs.readFileSync(inputSVGFile, "utf8");
const numCharacters: number = svgData.length;

let cleanedSvg: string = svgData.replace(
    /<style[\s\S]*<\/style>/,
    `<style>
.state-box {fill:none;}
.state-box.failure {fill:red;}
.state-box.success {fill:green;}

text.arrow {
    fill:black;
    font-size:20px;
}
text.arrow.failure {fill:red;}
text.arrow.success {fill:green;}

path.arrow {stroke:black;}
path.arrow.failure {stroke:red;}
path.arrow.success {stroke:green;}
* {font-family:Arial;}
    </style>`,
);

cleanedSvg = cleanedSvg.replace(/white-space: pre;/g, "");
cleanedSvg = cleanedSvg.replace(/style=""/g, "");

// note: don't delete mask="url(#mask-vpggnQDtsvPvEl4MILJxK)" within <g>
// these are used to add whitespace to the arrow text
//cleanedSvg = cleanedSvg.replace(/mask="url\(.*?\)"/g, " ");

const svgDom = new JSDOM(cleanedSvg);
const document: Document = svgDom.window.document;
const groups: NodeListOf<SVGGElement> = document.querySelectorAll("g");

if (!groups) {
    throw new Error("No groups found");
}
const numGroups = groups.length;
groups.forEach((group: SVGGElement, index: number) => {
    const isStateBox: boolean = isFontSize(28, group);
    const isStateTransitionArrow: boolean =
        !isStateBox && isFontSize(20, group);

    if (isStateBox) handleStateBox(group, index, groups);
    if (isStateTransitionArrow) handleArrow(group);
});

const svgOutput = svgDom.window.document.querySelector("svg");
fs.writeFileSync(outputSVGFile, svgOutput!.outerHTML, "utf-8");
generateTypeEnums();

// functions

function isFontSize(size: number, svgGroup: SVGGElement): boolean {
    return svgGroup.outerHTML.includes(`font-size="${size}px"`);
}

function handleStateBox(
    group: SVGGElement,
    index: number,
    groups: NodeListOf<SVGGElement>,
): void {
    // with excalidraw the box group comes first then the text inside the box comes next
    // update the previous group with a class that contains the text from the curremnt group
    if (index < 1) return;

    const textKebabCase: string = getUniqueClass(
        getTextWithoutTagsKebabCase(group),
        "state-box",
    );
    // update the path that contains the background color only
    const className = `state-box ${textKebabCase}`;
    const previousGroup: SVGGElement = groups[index - 1];
    const path: SVGPathElement | null = previousGroup.querySelector("path");
    if (path == null) {
        throw new Error(`No path found in ${textKebabCase} state box`);
    }
    // only update the first path in the previous group
    path.setAttribute("class", className);

    path.removeAttribute("fill");
}

function handleArrow(group: SVGGElement): void {
    const textKebabCase: string = getUniqueClass(
        getTextWithoutTagsKebabCase(group),
        "arrow",
    );
    const className = `arrow ${textKebabCase}`;
    const paths: NodeListOf<SVGPathElement> = group.querySelectorAll("path");
    for (const pathEl of paths) {
        pathEl.setAttribute("class", className);
    }
    const texts: NodeListOf<SVGTextElement> = group.querySelectorAll("text");
    for (const textEl of texts) {
        textEl.setAttribute("class", className);
        // delete the font-size and font-family attributes
        textEl.removeAttribute("font-size");
        textEl.removeAttribute("font-family");
    }
}

function getTextWithoutTagsKebabCase(group: SVGGElement): string {
    let accumulatedText: string = "";
    for (const text of group.querySelectorAll("text")) {
        accumulatedText += " " + text.textContent;
    }
    return accumulatedText
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/\s/g, "-")
        .replace("&amp;", "and")
        .replace("&", "and");
}

/** make a unique class name by appending a number if it already exists */
function getUniqueClass(className: string, elementType: string): string {
    const classList = duplicateClasses.get(elementType);
    for (let i = 0; i < 100; i++) {
        const appendage = i === 0 ? "" : `-${i}`;
        const newClassName = `${className}${appendage}`;
        if (!classList?.includes(newClassName)) {
            classList?.push(newClassName);
            return newClassName;
        }
    }
    return className;
}

function generateTypeEnums(): void {
    const arrowClasses = duplicateClasses.get("arrow") ?? [];
    const stateBoxClasses = duplicateClasses.get("state-box") ?? [];
    const output = `// file auto-generated by scripts/clean-svg.ts

${generateEnum("ArrowClass", arrowClasses)}
${generateEnum("StateBoxClass", stateBoxClasses)}
`;
    fs.writeFileSync(outputSVGTypesFile, output, "utf-8");
}

function generateEnum(enumName: string, classNames: string[]): string {
    const enumEntries = classNames
        .map(
            (classInKebabCase) =>
                `${TAB}${kebabToPascalCase(classInKebabCase)} ` +
                `= "${classInKebabCase}",`,
        )
        .join("\n");
    return `export enum ${enumName} {\n${enumEntries}\n}\n`;
}

function kebabToPascalCase(str: string) {
    const singleCharAfterDash = /-([a-z0-9])/gi;
    const camelCase = str
        .replace(singleCharAfterDash, (entireRegexMatch, char) =>
            char.toUpperCase(),
        )
        .replace(/^-/, "");
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}
