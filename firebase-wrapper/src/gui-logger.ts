import { HTMLTemplateManager } from "./html-template-manager";

export interface LogItem {
    logMessage: string;
    logData?: any;
    safeLocalStorageData?: any;
    imageURL?: string | null;
    logDateTime?: string | null;
    color?: string | null;
    fromLocalStorage?: boolean;
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
    private localStorageColorKey: string = "logstreamColor";
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
    private currentColor: string;

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

        this.currentColor = this.setupRandomLogstreamColor();

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

        const savedLogstreamItems: LogItem[] = JSON.parse(savedLogstreamJSON);
        for (const logItem of savedLogstreamItems) {
            logItem.fromLocalStorage = true;
            this.log(logItem);
        }
        return this;
    }

    public clearLogstream(e: Event): void {
        this._window.localStorage.removeItem(this.localStorageLogstreamKey);
        this.logContainerElement.innerHTML = "";
        this._window.localStorage.removeItem(this.localStorageColorKey);
    }

    public log(logItemInput: LogItem): void {
        const logItemElement: HTMLElement =
            this.htmlTemplateManager.cloneTemplateSingle(this.logItemCSS);

        if (logItemInput.color == null) {
            logItemInput.color = this.currentColor;
        }
        logItemElement.style.backgroundColor = logItemInput.color;
        logItemElement.querySelector(".log-message")!.innerHTML =
            logItemInput.logMessage;

        if (logItemInput.logDateTime == null) {
            logItemInput.logDateTime = this.getDate();
        }
        logItemElement.querySelector(".log-datetime")!.innerHTML =
            logItemInput.logDateTime;

        const renderData: any =
            logItemInput.logData != null
                ? logItemInput.logData
                : logItemInput.safeLocalStorageData;
        if (renderData != null) {
            const dataElement = logItemElement.querySelector(
                ".log-data",
            ) as HTMLElement;
            dataElement.innerHTML = JSON.stringify(renderData, null, 4);
            dataElement.style.display = "block";
        }

        if (logItemInput.imageURL != null) {
            const thisImage = logItemElement.querySelector(
                "img.image",
            ) as HTMLImageElement;
            thisImage.src = logItemInput.imageURL;
            thisImage.style.display = "block";
        }

        this.htmlTemplateManager.prependElement(
            logItemElement,
            this.logContainerElement,
        );

        console.log(logItemInput.logMessage, logItemInput.logData);
        logItemInput.logData = null; // unsafe - do not save
        if (!logItemInput.fromLocalStorage) {
            this.saveLogToLocalStorage(logItemInput);
        }
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

    private setupRandomLogstreamColor(): string {
        const previousColor: string | null = this._window.localStorage.getItem(
            this.localStorageColorKey,
        );
        while (true) {
            const newColor: string =
                this.colors[Math.floor(Math.random() * this.colors.length)];
            if (newColor === previousColor) continue;

            this._window.localStorage.setItem(
                this.localStorageColorKey,
                newColor,
            );
            return newColor;
        }
    }
}
