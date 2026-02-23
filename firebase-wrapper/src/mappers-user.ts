import { User, UserInfo } from "firebase/auth";
import type { TDBUserDTO, TDBUserInfo } from "./db-user.ts";
import { TAuthProvider } from "./firebase-wrapper";

export function mapFirebaseUser2DBUserDTO(user: User): TDBUserDTO {
    if (user?.providerData == null) {
        return null;
    }

    const dbUserDTO: TDBUserDTO = {};
    for (const userInfo of user.providerData) {
        const providerID = userInfo.providerId as TAuthProvider;
        dbUserDTO[providerID] = mapUserInfo2DBUserInfo(user);
    }
    return dbUserDTO;
}

/** filter properties we want to keep */
function mapUserInfo2DBUserInfo(userInfo: UserInfo): TDBUserInfo {
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
