import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  reauthenticateWithCredential,
  OAuthProvider,
  linkWithCredential,
  signInWithCredential,
  type Auth,
} from "firebase/auth";
export async function signInApple(auth: Auth) {
  if (!(await AppleAuthentication.isAvailableAsync()))
    throw new Error(
      "Apple sign-in is unavailable on this device. Use email and password.",
    );
  const rawNonce = Crypto.randomUUID();
  const nonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  const response = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    nonce,
  });
  if (!response.identityToken)
    throw new Error("Apple did not return an identity token. Please retry.");
  const credential = new OAuthProvider("apple.com").credential({
    idToken: response.identityToken,
    rawNonce,
  });
  if (auth.currentUser?.isAnonymous) {
    try {
      return await linkWithCredential(auth.currentUser, credential);
    } catch (e) {
      if ((e as { code?: string }).code !== "auth/credential-already-in-use")
        throw e;
    }
  }
  return signInWithCredential(auth, credential);
}

export async function revokeApple(
  auth: Auth,
  revokeCode: (code: string) => Promise<unknown>,
) {
  const user = auth.currentUser;
  if (!user?.providerData.some((p) => p.providerId === "apple.com")) return;
  const rawNonce = Crypto.randomUUID();
  const nonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  const response = await AppleAuthentication.signInAsync({ nonce });
  if (!response.identityToken || !response.authorizationCode)
    throw new Error("Apple authorization is required to delete this account.");
  await reauthenticateWithCredential(
    user,
    new OAuthProvider("apple.com").credential({
      idToken: response.identityToken,
      rawNonce,
    }),
  );
  await revokeCode(response.authorizationCode);
}
