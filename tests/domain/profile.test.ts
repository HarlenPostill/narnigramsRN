import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDisplayName } from "../../shared/profile";
import { onlineErrorMessage } from "../../utils/online-errors";
test("public names support Unicode and normalize spaces without accepting invisible controls", () => {
  assert.equal(normalizeDisplayName("  Zoë   王  "), "Zoë 王");
  assert.equal(normalizeDisplayName("😀".repeat(30)), "😀".repeat(30));
  for (const value of [null, 42, "", "x".repeat(31), "a\u0000b", "a\u202eb"])
    assert.equal(normalizeDisplayName(value), null);
});
test("connection errors give recovery steps without exposing backend diagnostics", () => {
  assert.match(
    onlineErrorMessage({ code: "functions/unauthenticated" }),
    /Account settings/,
  );
  assert.match(
    onlineErrorMessage({ code: "functions/deadline-exceeded" }),
    /connection/,
  );
  assert.doesNotMatch(
    onlineErrorMessage(new Error("private diagnostic")),
    /private diagnostic/,
  );
});
