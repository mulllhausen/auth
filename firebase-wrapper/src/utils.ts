import { baseEnv } from "./dotenv.base.ts";
import type { TFirebaseWrapperEnv } from "./dotenv.d.ts";
import { developmentEnv } from "./dotenv.development.ts";
import { productionEnv } from "./dotenv.production.ts";

export type TMutable<T> = {
    -readonly [K in keyof T]: T[K];
};

export function getFirebaseWrapperEnv(): TFirebaseWrapperEnv {
    let overrideEnv: Partial<TFirebaseWrapperEnv> = {};
    switch (import.meta.env.MODE) {
        case "development":
            const modules = import.meta.glob("./dotenv.development.secret.ts", {
                eager: true,
            });
            const developmentSecrets = modules[
                "./dotenv.development.secret.ts"
            ] as { developmentSecretEnv?: Partial<TFirebaseWrapperEnv> } | undefined;
            overrideEnv = {
                ...developmentEnv,
                ...(developmentSecrets?.developmentSecretEnv ?? {}),
            };
            break;
        case "production":
            overrideEnv = productionEnv;
            break;
    }
    return { ...baseEnv, ...overrideEnv };
}

export function onReady(callback: () => void): void {
    switch (document.readyState) {
        case "loading":
            document.addEventListener("DOMContentLoaded", callback, {
                once: true,
            });
            break;
        case "complete":
        case "interactive":
            callback();
            break;
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

export function deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export function objIsNullOrEmpty<T>(obj: T): boolean {
    return obj == null || Object.keys(obj).length === 0;
}

export async function wait(milliseconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
