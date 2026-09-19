import assert from "node:assert/strict";
import { test } from "node:test";
import { authErrorCode, authErrorMessage } from "../../utils/auth-errors";

test("Apple credential failures cannot be mistaken for incorrect passwords", () => {
  const error = {
    code: "auth/invalid-credential",
    customData: { idToken: "never-display-this-token" },
  };
  assert.match(
    authErrorMessage(error, "apple")!,
    /Apple sign-in could not be verified/,
  );
  assert.doesNotMatch(
    authErrorMessage(error, "apple")!,
    /password|never-display/,
  );
  assert.equal(
    authErrorMessage(error, "email"),
    "Email or password is incorrect.",
  );
  assert.equal(authErrorCode(error), "auth/invalid-credential");
});
test("Apple cancellation is silent and untrusted diagnostics cannot leak credentials", () => {
  assert.equal(
    authErrorMessage({ code: "ERR_REQUEST_CANCELED" }, "apple"),
    null,
  );
  assert.equal(
    authErrorMessage({ code: "auth/popup-closed-by-user" }, "apple"),
    null,
  );
  assert.equal(
    authErrorCode({ code: "bad code containing token=secret" }),
    "unknown",
  );
  assert.equal(authErrorCode(null), "unknown");
  assert.doesNotMatch(
    authErrorMessage(new Error("secret token"), "apple")!,
    /secret token/,
  );
});
