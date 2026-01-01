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
