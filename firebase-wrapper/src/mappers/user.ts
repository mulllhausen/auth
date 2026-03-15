// todo: clean this file up. maybe some functions are duplicates
import type {
    OAuthCredential,
    User,
    UserCredential,
    UserInfo,
} from "firebase/auth";
import type {
    TDBSafeUserDTO,
    TDBSafeUserInfo,
    TDBUserDTO,
    TDBUserInfo,
} from "../db-user.ts";
import type {
    TSafeOAuthCredential,
    TSafeTokenResponse,
    TSafeUser,
    TSafeUserCredential,
    TSafeUserInfo,
} from "../firebase-safe-types.ts";
import type {
    TAuthProvider,
    TUserWithAccessToken,
} from "../firebase-wrapper.ts";

export function mapFirebaseUser2DBUserDTO(
    user: TUserWithAccessToken,
): TDBUserDTO {
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

export function safeUserCredential(
    userCredential: UserCredential,
    idempotent: boolean = false, // use for comparing objects
    hiddenMessage: string,
): TSafeUserCredential {
    return {
        user: safeUserResponse(userCredential.user, idempotent, hiddenMessage),
        providerId: userCredential.providerId,
        operationType: userCredential.operationType,
        _tokenResponse: safeTokenResponse(
            (userCredential as unknown as TSafeUserCredential)._tokenResponse,
            idempotent,
            hiddenMessage,
        ),
    };
}

function safeTokenResponse(
    tokenResponse: TSafeTokenResponse,
    idempotent: boolean = false, // use for comparing objects
    hiddenMessage: string,
): TSafeTokenResponse {
    return {
        kind: tokenResponse.kind,
        idToken: hiddenMessage,
        email: tokenResponse.email,
        refreshToken: hiddenMessage,
        expiresIn: idempotent ? "0" : tokenResponse.expiresIn,
        localId: tokenResponse.localId,
        isNewUser: tokenResponse.isNewUser,
    };
}

export function safeUserResponse(
    user: User,
    idempotent: boolean = false, // use for comparing objects
    hiddenMessage: string,
): TSafeUser {
    const _user = user as unknown as TSafeUser;
    return {
        uid: _user.uid,
        email: _user.email,
        emailVerified: _user.emailVerified,
        displayName: _user.displayName,
        isAnonymous: _user.isAnonymous,
        photoURL: _user.photoURL,
        providerData: user.providerData.map((eachProviderData) =>
            safeUserInfo(eachProviderData),
        ),
        stsTokenManager: {
            refreshToken: hiddenMessage,
            accessToken: hiddenMessage,
            expirationTime: idempotent
                ? 0
                : _user.stsTokenManager?.expirationTime,
        },
        createdAt: idempotent ? "0" : _user.createdAt,
        lastLoginAt: idempotent ? "0" : _user.lastLoginAt,
        apiKey: hiddenMessage,
        appName: _user.appName,
        metadata: _user.metadata,
        refreshToken: hiddenMessage,
        tenantId: hiddenMessage,
        phoneNumber: _user.phoneNumber,
        providerId: _user.providerId,
    };
}

function safeUserInfo(userInfo: UserInfo): TSafeUserInfo {
    return {
        providerId: userInfo.providerId,
        uid: userInfo.uid,
        displayName: userInfo.displayName,
        email: userInfo.email,
        phoneNumber: userInfo.phoneNumber,
        photoURL: userInfo.photoURL,
    };
}

export function safeCredentialResponse(
    credential: OAuthCredential,
    hiddenMessage: string,
): TSafeOAuthCredential {
    return {
        idToken: hiddenMessage,
        accessToken: hiddenMessage,
        secret: hiddenMessage,
        nonce: hiddenMessage,
        pendingToken: hiddenMessage,
    };
}
