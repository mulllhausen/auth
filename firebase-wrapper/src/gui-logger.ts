import { HTMLTemplateManager } from "./html-template-manager";

export interface LogItem {
    logAction: string;
    logData: any;
    color: string;
    logDateTime: string;
}

export class GUILogger {
    private _document: Document;
    private htmlTemplateManager: HTMLTemplateManager;
    private logContainerCSS: string = "#windowLogContainer";
    private logContainerEl: HTMLElement;
    private logItemCSS: string = "#windowLogItem";
    private cleaLogStreamButtonCSS: string = "button#clearLogstream";
    private localStorageLogstreamKey: string = "logstream";
    private colors: string[] = [
        "#c6edff", // blue
        "#ffd8d8", // red
        "#d9ffd8", // green
        "#e9d8ff", // purple
        "#ffe7d8", // orange
        "#faffd8", // yellow
        "#ffd8ff", // pink
        "#ba9d93", // brown
    ];
    private currentSessionColor = this.getRandomLogstreamColor();

    constructor(
        _document: Document,
        htmlTemplateManager: HTMLTemplateManager,
        cleaLogStreamButtonCSS: string,
        logContainerCSS: string,
        logItemCSS: string,
    ) {
        this._document = _document;
        this.htmlTemplateManager = htmlTemplateManager;
        this.cleaLogStreamButtonCSS = cleaLogStreamButtonCSS;

        this.logContainerCSS = logContainerCSS;
        this.logContainerEl = this._document.querySelector(
            this.logContainerCSS,
        ) as HTMLElement;

        if (this.logContainerEl == null) {
            throw new Error(`unable to find log container ${logContainerCSS}`);
        }
        this.logItemCSS = logItemCSS;
    }

    public initEvents() {
        this._document
            .querySelector(this.cleaLogStreamButtonCSS)
            ?.addEventListener("click", this.clearLogstream);
    }

    public initGUIFromLocalStorage() {
        const savedLogstreamJSON: string | null = localStorage.getItem(
            this.localStorageLogstreamKey,
        );
        if (savedLogstreamJSON == null) return;

        const savedLogstreamItems = JSON.parse(savedLogstreamJSON) as LogItem[];
        const fromLocalStorage = true;
        for (const logItem of savedLogstreamItems) {
            this.log(
                logItem.logAction,
                logItem.logData,
                logItem.logDateTime,
                logItem.color,
                fromLocalStorage,
            );
        }
    }

    public clearLogstream(e: Event) {
        localStorage.removeItem(this.localStorageLogstreamKey);
        this.logContainerEl.innerHTML = "";
    }

    public log(
        logAction: string,
        logData: any,
        logDateTime: string | null = null,
        color: string | null = null,
        fromLocalStorage: boolean = false,
    ) {
        const logItem: HTMLElement =
            this.htmlTemplateManager.cloneTemplateSingle(this.logItemCSS);

        if (color == null) {
            color = this.currentSessionColor;
        }
        logItem.style.backgroundColor = color;
        logItem.querySelector(".log-message")!.innerHTML = logAction;

        if (logDateTime == null) {
            logDateTime = this.getDate();
        }
        logItem.querySelector(".log-datetime")!.innerHTML = logDateTime;

        if (logData != null) {
            logItem.querySelector(".log-data")!.innerHTML = JSON.stringify(
                logData,
                null,
                4,
            );
        }

        this.htmlTemplateManager.prependElement(logItem, this.logContainerEl);

        if (!fromLocalStorage)
            this.saveLogToLocalStorage({
                logAction,
                logData,
                color,
                logDateTime: logDateTime,
            });

        console.log(logAction, logData);
    }

    private getDate(): string {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, "0");
        const minutes = now.getMinutes().toString().padStart(2, "0");
        const seconds = now.getSeconds().toString().padStart(2, "0");
        const milliseconds = now.getMilliseconds().toString().padStart(3, "0");

        return `${hours}:${minutes}:${seconds}.${milliseconds}`;
    }

    public saveLogToLocalStorage(logItem: LogItem): void {
        const savedLogstreamJSON: string | null = localStorage.getItem(
            this.localStorageLogstreamKey,
        );
        if (savedLogstreamJSON == null) {
            localStorage.setItem(
                this.localStorageLogstreamKey,
                JSON.stringify([logItem]),
            );
            return;
        }
        const savedLogstreamItems = JSON.parse(savedLogstreamJSON);
        savedLogstreamItems.push(logItem);
        localStorage.setItem(
            this.localStorageLogstreamKey,
            JSON.stringify(savedLogstreamItems),
        );
    }

    private getRandomLogstreamColor(): string {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }
}
