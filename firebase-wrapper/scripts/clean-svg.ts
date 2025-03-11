import fs from "fs";
import { JSDOM } from "jsdom";

const inputFile: string = "./public/images/fsm-email-link2.svg";
const outputFile: string = "./public/images/fsm-email-link2-cleaned.svg";
const duplicateClasses: Map<string, string[]> = new Map([
    ["arrow", []],
    ["state-box", []],
]);

const svgData: string = fs.readFileSync(inputFile, "utf8");

let cleanedSvg: string = svgData.replace(
    /<style[\s\S]*<\/style>/,
    `<style>
      .state-box {fill:none;}
      .state-box.failure {fill:red;}
      .state-box.success {fill:green;}

      text.arrow {fill:black;}
      text.arrow.failure {fill:red;}
      text.arrow.success {fill:green;}

      path.arrow {stroke:black;}
      path.arrow.failure {stroke:red;}
      path.arrow.success {stroke:green;}
    </style>`,
);

// delete all font-family="Nunito, Segoe UI Emoji"
cleanedSvg = cleanedSvg.replace(/ ?font-family=".*" ?/g, " ");

const svgDom = new JSDOM(cleanedSvg);
const document: Document = svgDom.window.document;
const groups: NodeListOf<SVGGElement> = document.querySelectorAll("g");

// maybe delete mask="url(#mask-vpggnQDtsvPvEl4MILJxK)" within <g>
//cleanedSvg = svgData.replace(/mask="url([\s\S]+?)"/, ' ');

if (!groups) {
    throw new Error("No groups found");
}

groups.forEach((group: SVGGElement, index: number) => {
    const isStateBox: boolean = isFontSize(28, group);
    const isStateTransitionArrow: boolean = isFontSize(16, group);
    if (isStateBox) handleStateBox(group, index, groups);
    if (isStateTransitionArrow) handleArrow(group);
});

const svgOutput = svgDom.window.document.querySelector("svg");
fs.writeFileSync(outputFile, svgOutput!.outerHTML, "utf-8");

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
