import test from "node:test";
import assert from "node:assert/strict";
import { validateDevelopmentTarget } from "../scripts/create-dev-user.mjs";

test("development provisioning rejects production databases and shared credentials before connecting", () => {
  for (const uri of [
    undefined,
    "mongodb+srv://production-user:example@cluster.example/insightboard",
    "mongodb+srv://insightboard_dev_app:example@cluster.example/insightboard",
    "mongodb+srv://production-user:example@cluster.example/insightboard_dev",
    "mongodb+srv://insightboard_dev_app:example@cluster.example/",
    "https://insightboard_dev_app:example@cluster.example/insightboard_dev",
  ]) {
    assert.throws(() => validateDevelopmentTarget(uri));
  }
});

test("development provisioning accepts only the explicitly dedicated database and user", () => {
  assert.equal(validateDevelopmentTarget("mongodb+srv://insightboard_dev_app:example@cluster.example/insightboard_dev?retryWrites=true&w=majority"), "insightboard_dev");
});
