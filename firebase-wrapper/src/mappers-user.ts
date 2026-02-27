import { UserInfo } from "firebase/auth";
import type {
    TDBSafeUserDTO,
    TDBSafeUserInfo,
    TDBUserDTO,
    TDBUserInfo,
} from "./db-user.ts";
import type { TAuthProvider, TUserWithToken } from "./firebase-wrapper.ts";

export function mapFirebaseUser2DBUserDTO(user: TUserWithToken): TDBUserDTO {
    if (user?.providerData == null) {
        return null;
    }
    const dbUserDTO: TDBUserDTO = {};
    for (const userInfo of user.providerData) {
        const providerID = userInfo.providerId as TAuthProvider;
        dbUserDTO[providerID] = mapUserInfo2DBSafeUserInfo(
            userInfo,
        ) as TDBUserInfo;
    }
    // the user object has all the providers we have signed in with,
    // as well as the most recent provider's token
    const providerID = user.providerId as TAuthProvider;
    dbUserDTO[providerID]!.token = user.token;
    dbUserDTO[providerID]!.tokenExpiry = user.tokenExpiry;
    return dbUserDTO;
}

export function mapDBUserDTO2SafeUserDTO(userDTO: TDBUserDTO): TDBSafeUserDTO {
    if (!userDTO) return null;

    const safeUserDTO: TDBSafeUserDTO = {};
    for (const provider in userDTO) {
        const userInfo = userDTO[provider as TAuthProvider];
        if (!userInfo) continue;
        safeUserDTO[provider as TAuthProvider] =
            mapUserInfo2DBSafeUserInfo(userInfo);
    }
    return safeUserDTO;
}

/** filter properties we want to keep */
function mapUserInfo2DBSafeUserInfo(userInfo: UserInfo): TDBSafeUserInfo {
    return {
        displayName: userInfo.displayName,
        email: userInfo.email,
        phoneNumber: userInfo.phoneNumber,
        photoURL: userInfo.photoURL,
        providerId: userInfo.providerId,
        uid: userInfo.uid,
    };
}

export function mapMergeUserDTOs(
    originalUserDTO: TDBUserDTO,
    newUserDTO: TDBUserDTO,
): TDBUserDTO {
    if (!originalUserDTO && !newUserDTO) return null;
    return {
        ...(originalUserDTO ?? {}),
        ...(newUserDTO ?? {}),
    };
}
