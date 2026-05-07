import type { UserInfo } from "firebase/auth";
import type { TAuthProvider } from "./firebase-wrapper.ts";
import { mapDBUserDTO2SafeUserDTO } from "./mappers/user.ts";
import type { TMutable } from "./utils.ts";
import { objIsNullOrEmpty, strIsNullOrEmpty } from "./utils.ts";

// #region consts and types

const localStorageUserKey = "dbUser";
const localStorageUserLoggedInKey = "dbUserLoggedIn";

export type TDBUserDTO = {
    uid: string;
    providerData: Partial<Record<TAuthProvider, TDBUserInfo>>;
} | null;
export type TDBSafeUserDTO = Partial<
    Record<TAuthProvider, TDBSafeUserInfo>
> | null;

export type TDBUserInfo = TDBSafeUserInfo & {
    accessToken?: string;
    tokenExpiry?: number;
};

/** note: localstorage is not secure so don't put any data in here that
 * could be used for an xss attack */
export type TDBSafeUserInfo = TMutable<
    Pick<
        UserInfo,
        | "displayName"
        | "email"
        | "phoneNumber"
        | "photoURL"
        | "providerId"
        | "uid"
    >
>;

// #endregion consts and types

// #region user-data

export function dbSaveUser(userDTO: TDBUserDTO) {
    if (objIsNullOrEmpty(userDTO)) {
        window.localStorage.removeItem(localStorageUserKey);
        return;
    }

    window.localStorage.setItem(
        localStorageUserKey,
        JSON.stringify(mapDBUserDTO2SafeUserDTO(userDTO)),
    );
}

/** assume this is using the http-only cookie to access the DB */
export function dbGetUser(): TDBUserDTO {
    const userDTOJSON: string | null =
        window.localStorage.getItem(localStorageUserKey);

    if (objIsNullOrEmpty(userDTOJSON)) {
        return null;
    }

    return JSON.parse(userDTOJSON!);
}

export function dbDeleteUser(): void {
    window.localStorage.removeItem(localStorageUserKey);
}

// #endregion user-data

// #region login-status

export function dbIsUserLoggedIn(): boolean {
    const userID = window.localStorage.getItem(localStorageUserLoggedInKey);
    return !strIsNullOrEmpty(userID);
}

export function dbLoginUser(userID: string | undefined): boolean {
    if (strIsNullOrEmpty(userID)) {
        return false;
    }
    window.localStorage.setItem(localStorageUserLoggedInKey, userID!);
    return true;
}

export function dbLogoutUser(userID: string | undefined): boolean {
    if (strIsNullOrEmpty(userID)) {
        return false;
    }
    window.localStorage.removeItem(localStorageUserLoggedInKey);
    return true;
}

// #endregion login-status
