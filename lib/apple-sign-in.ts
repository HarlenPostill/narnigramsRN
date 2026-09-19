import {
  reauthenticateWithPopup,
  revokeAccessToken,
  OAuthProvider,
  signInWithCredential,
  signInWithPopup,
  linkWithPopup,
  type Auth,
} from "firebase/auth";
export async function signInApple(auth: Auth) {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  if (auth.currentUser?.isAnonymous) {
    try {
      return await linkWithPopup(auth.currentUser, provider);
    } catch (e) {
      if ((e as { code?: string }).code !== "auth/credential-already-in-use")
        throw e;
      const credential = OAuthProvider.credentialFromError(
        e as import("firebase/app").FirebaseError,
      );
      if (!credential) throw e;
      return signInWithCredential(auth, credential);
    }
  }
  return signInWithPopup(auth, provider);
}

export async function revokeApple(
  auth: Auth,
  _revokeCode: (code: string) => Promise<unknown>,
) {
  const user = auth.currentUser;
  if (!user?.providerData.some((p) => p.providerId === "apple.com")) return;
  const result = await reauthenticateWithPopup(
    user,
    new OAuthProvider("apple.com"),
  );
  const token = OAuthProvider.credentialFromResult(result)?.accessToken;
  if (!token)
    throw new Error("Apple authorization is required to delete this account.");
  await revokeAccessToken(auth, token);
}
