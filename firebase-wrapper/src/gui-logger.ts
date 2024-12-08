import { HTMLTemplateManager } from "./html-template-manager";

export interface LogItem {
    logAction: string;
    logData: any;
    safeLocalStorageData: any;
    imageURL: string | null;
    color: string;
    logDateTime: string;
}

export class GUILogger {
    private _document: Document;
    private _window: Window;
    private htmlTemplateManager: HTMLTemplateManager;
    private logContainerCSS: string = "#windowLogContainer";
    private logContainerElement: HTMLElement;
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
        _window: Window,
        htmlTemplateManager: HTMLTemplateManager,
        cleaLogStreamButtonCSS: string,
        logContainerCSS: string,
        logItemCSS: string,
    ) {
        this._document = _document;
        this._window = window;
        this.htmlTemplateManager = htmlTemplateManager;
        this.cleaLogStreamButtonCSS = cleaLogStreamButtonCSS;

        this.logContainerCSS = logContainerCSS;
        this.logContainerElement = this._document.querySelector(
            this.logContainerCSS,
        ) as HTMLElement;

        if (this.logContainerElement == null) {
            throw new Error(`unable to find log container ${logContainerCSS}`);
        }
        this.logItemCSS = logItemCSS;
    }

    public initEvents(): GUILogger {
        this._document
            .querySelector(this.cleaLogStreamButtonCSS)
            ?.addEventListener("click", this.clearLogstream.bind(this));
        return this;
    }

    public initGUIFromLocalStorage(): GUILogger {
        const savedLogstreamJSON: string | null =
            this._window.localStorage.getItem(this.localStorageLogstreamKey);
        if (savedLogstreamJSON == null) return this;

        const savedLogstreamItems = JSON.parse(savedLogstreamJSON) as LogItem[];
        const fromLocalStorage = true;
        for (const logItem of savedLogstreamItems) {
            this.log(
                logItem.logAction,
                logItem.logData,
                logItem.safeLocalStorageData,
                logItem.imageURL,
                logItem.logDateTime,
                logItem.color,
                fromLocalStorage,
            );
        }
        return this;
    }

    public clearLogstream(e: Event): void {
        this._window.localStorage.removeItem(this.localStorageLogstreamKey);
        this.logContainerElement.innerHTML = "";
    }

    public log(
        logAction: string,
        logData: any,
        safeLocalStorageData: any,
        imageURL: string | null = null,
        logDateTime: string | null = null,
        color: string | null = null,
        fromLocalStorage: boolean = false,
    ): void {
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

        const renderData: any =
            logData != null ? logData : safeLocalStorageData;
        if (renderData != null) {
            const dataElement = logItem.querySelector(
                ".log-data",
            ) as HTMLElement;
            dataElement.innerHTML = JSON.stringify(renderData, null, 4);
            dataElement.style.display = "block";
        }

        if (imageURL != null) {
            const thisImage = logItem.querySelector(
                "img.image",
            ) as HTMLImageElement;
            thisImage.src = imageURL;
            thisImage.style.display = "block";
        }

        this.htmlTemplateManager.prependElement(
            logItem,
            this.logContainerElement,
        );

        if (!fromLocalStorage)
            this.saveLogToLocalStorage({
                logAction,
                logData: null, // unsafe - do not save
                safeLocalStorageData,
                imageURL,
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
        const savedLogstreamJSON: string | null =
            this._window.localStorage.getItem(this.localStorageLogstreamKey);
        if (savedLogstreamJSON == null) {
            this._window.localStorage.setItem(
                this.localStorageLogstreamKey,
                JSON.stringify([logItem]),
            );
            return;
        }
        const savedLogstreamItems = JSON.parse(savedLogstreamJSON);
        savedLogstreamItems.push(logItem);
        this._window.localStorage.setItem(
            this.localStorageLogstreamKey,
            JSON.stringify(savedLogstreamItems),
        );
    }

    private getRandomLogstreamColor(): string {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }
}
