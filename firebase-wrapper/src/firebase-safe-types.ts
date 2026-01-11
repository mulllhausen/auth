import { OAuthCredential, User, UserCredential, UserInfo } from "firebase/auth";

// the types in this file are used when sanitising data for logging
// - pick out the properties and drop the functions
// - add undocumented internal properties that are *actually* returned in the objects
// - restrict objects to known properties

// note 1: undocumented properties could change without warning in future.

// note 2: if more properties may be added by firebase in future then this file will
// need updating

export type TSafeUserCredential = Pick<
    UserCredential,
    "providerId" | "operationType"
> & {
    user: TSafeUser;
    _tokenResponse: TSafeTokenResponse;
};

export type TSafeTokenResponse = {
    kind: string;
    idToken: string;
    email: string;
    refreshToken: string;
    expiresIn: string;
    localId: string;
    isNewUser: boolean;
};

export type TSafeUserInfo = Pick<
    UserInfo,
    "displayName" | "email" | "phoneNumber" | "photoURL" | "providerId" | "uid"
>;

export type TSafeUser = Pick<
    User,
    | "uid"
    | "email"
    | "emailVerified"
    | "displayName"
    | "isAnonymous"
    | "photoURL"
    | "metadata"
    | "refreshToken"
    | "tenantId"
    | "phoneNumber"
    | "providerId"
> & {
    providerData: TSafeUserInfo[];
    stsTokenManager: {
        refreshToken: string;
        expirationTime: number;
        accessToken: string;
    };
    createdAt?: string;
    lastLoginAt?: string;
    apiKey?: string;
    appName?: string;
};

export type TSafeOAuthCredential = Pick<
    OAuthCredential,
    "idToken" | "accessToken" | "secret"
> & {
    nonce: string;
    pendingToken: string;
};
