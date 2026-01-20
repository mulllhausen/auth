export function onSvgReady(props: {
    svgQuerySelector: string;
    callback: (svgDoc: Document) => void;
}) {
    const svgObj = document.querySelector(
        props.svgQuerySelector,
    ) as HTMLObjectElement | null;
    if (!svgObj) throw new Error(`failed to find svg`);

    if (svgObj.contentDocument) {
        props.callback(svgObj.contentDocument);
    } else {
        svgObj.addEventListener("load", () => {
            if (svgObj.contentDocument) {
                props.callback(svgObj.contentDocument);
            }
        });
    }
}

export function debounce<TFunction extends (...args: any[]) => void>(
    _function: TFunction,
    delayMs: number,
) {
    let timer: number | null = null;

    return {
        call(...args: Parameters<TFunction>) {
            if (timer != null) {
                window.clearTimeout(timer);
            }
            timer = window.setTimeout(() => {
                timer = null;
                _function(...args);
            }, delayMs);
        },
        flush(...args: Parameters<TFunction>) {
            if (timer != null) {
                window.clearTimeout(timer);
                timer = null;
            }
            _function(...args);
        },
    };
}

export function clearQueryParams(
    window_: Window & typeof globalThis,
    keysToRemove: string[],
    updateURLWithoutReloadingPage = true,
) {
    if (!Array.isArray(keysToRemove)) {
        throw new TypeError("keysToRemove must be an array of strings");
    }
    const url = new URL(window_.location.href);
    keysToRemove.forEach((key) => url.searchParams.delete(key));

    if (updateURLWithoutReloadingPage) {
        window_.history.replaceState({}, "", url.toString());
    } else {
        window_.history.pushState({}, "", url.toString());
    }
}

export function capsFirstLetter(str: string): string {
    return str[0].toUpperCase() + str.slice(1);
}
