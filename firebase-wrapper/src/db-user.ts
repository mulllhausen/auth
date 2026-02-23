import { UserInfo } from "firebase/auth";
import type { TAuthProvider } from "./firebase-wrapper";
import { objIsNullOrEmpty } from "./utils";

const localStorageUserKey = "dbUser";

export type TDBUserDTO = Partial<Record<TAuthProvider, TDBUserInfo>> | null;
export const dbUserDTO: TDBUserDTO = null;

/** note: localstorage is not secure so don't put any data in here that
 * could be used for an xss attack */
export type TDBUserInfo = Pick<
    UserInfo,
    "displayName" | "email" | "phoneNumber" | "photoURL" | "providerId" | "uid"
>;

export function dbSaveUser(userDTO: TDBUserDTO) {
    if (objIsNullOrEmpty(userDTO)) {
        window.localStorage.removeItem(localStorageUserKey);
        return;
    }

    window.localStorage.setItem(localStorageUserKey, JSON.stringify(userDTO));
}

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
