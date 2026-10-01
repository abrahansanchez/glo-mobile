const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const babel = require("../node_modules/@babel/core");
const ROOT = path.resolve(__dirname, "..");

function compile(file, mocks = {}) {
  const source = fs.readFileSync(file, "utf8");
  const code = babel.transformSync(source, {
    filename: file,
    plugins: [require("../node_modules/@babel/plugin-transform-react-jsx"), require("../node_modules/@babel/plugin-transform-modules-commonjs")],
  }).code;
  const sandbox = { exports: {}, module: { exports: {} }, console, Date, Set, Object, String, Boolean,
    require(id) { if (id in mocks) return mocks[id]; throw new Error(`Unexpected module: ${id}`); } };
  sandbox.module.exports = sandbox.exports;
  vm.runInNewContext(code, sandbox, { filename: file });
  return { exports: sandbox.module.exports, source };
}

const contract = compile(`${ROOT}/src/phone/forwardingContract.js`).exports;
const noop = () => {};
const verify = compile(`${ROOT}/src/screens/onboarding/ForwardingVerifyScreen.js`, {
  react: { __esModule: true, default: { createElement: noop }, useContext: noop, useEffect: noop, useMemo: noop, useRef: noop, useState: noop },
  "react-native": { ScrollView: noop, StyleSheet: { create: (v) => v } },
  "../../onboarding/OnboardingContext": { OnboardingContext: {} }, "../../config/api": { __esModule: true, default: {} },
  "../../onboarding/OnboardingHeader": { __esModule: true, default: noop }, "../../components/ui/AppButton": { __esModule: true, default: noop },
  "../../components/ui/AppCard": { __esModule: true, default: noop }, "../../components/ui/AppText": { __esModule: true, default: noop },
  "../../components/onboarding/OnboardingHero": { __esModule: true, default: noop }, "../../onboarding/stepKeys": { STEPS: { FORWARDING_VERIFICATION: "forwarding_verification" } },
  "../../ui/tokens": { spacing: { xs: 4, sm: 8, md: 12 } }, "../../theme/ThemeContext": { useTheme: noop }, "../../phone/forwardingContract": contract,
});
const source = (name) => fs.readFileSync(`${ROOT}/${name}`, "utf8");
const contextSource = source("src/onboarding/OnboardingContext.js");
let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log(`PASS ${passed}: ${name}`); }
const valid = { phoneSetupState: "awaiting_forwarding_setup", forwardFromNumber: "+12125550100", forwardToNumber: "+18135550199", forwardingCarrier: "T-Mobile" };
const plain = (value) => JSON.parse(JSON.stringify(value));

test("server-only values never enter generic onboarding data", () => {
  assert.deepStrictEqual(plain(contract.sanitizeGenericOnboardingData({ numberStrategy: "forward_existing", forwardFromNumber: "+12125550100", forwardToNumber: "+18135550199", verificationCode: "000042", phoneSetupState: "verified" })), { numberStrategy: "forward_existing", forwardFromNumber: "+12125550100" });
});
test("onboarding-step payload is sanitized", () => {
  const data = contract.sanitizeGenericOnboardingData({ forwardFromNumber: "+12125550100", forwardToNumber: "+18135550199", provisioningStatus: "assigned" });
  assert.deepStrictEqual(plain(data), { forwardFromNumber: "+12125550100" });
  assert.ok(contextSource.includes("data: sanitizeGenericOnboardingData(onboardingData)"));
});
test("generic persistence is fed sanitized data", () => {
  const data = contract.sanitizeGenericOnboardingData({ phoneNumber: "+12125550100", forwardToNumber: "+18135550199", verificationSessionId: "secret" });
  assert.deepStrictEqual(plain(data), { phoneNumber: "+12125550100" });
  assert.ok(contextSource.includes("await persistData(barberId, updated)"));
});
test("valid authenticated status replaces prior destination", () => {
  const oldState = contract.createAuthenticatedForwardingState("a", valid);
  const newState = contract.createAuthenticatedForwardingState("a", { ...valid, forwardToNumber: "+18135550222" });
  assert.strictEqual(contract.selectAuthenticatedForwardingStatus(oldState, "a").forwardToNumber, "+18135550199");
  assert.strictEqual(contract.selectAuthenticatedForwardingStatus(newState, "a").forwardToNumber, "+18135550222");
});
test("missing destination clears previous destination and fails closed", () => {
  const selected = contract.selectAuthenticatedForwardingStatus(contract.createAuthenticatedForwardingState("a", { phoneSetupState: "provisioning" }), "a");
  assert.strictEqual(selected.forwardToNumber, ""); assert.strictEqual(contract.getForwardingSetupControls(selected).canActivate, false);
});
test("malformed status clears previous destination and fails closed", () => {
  const selected = contract.selectAuthenticatedForwardingStatus(contract.createAuthenticatedForwardingState("a", { phoneSetupState: "bogus", forwardToNumber: "bad" }), "a");
  assert.strictEqual(selected.forwardToNumber, ""); assert.strictEqual(selected.phoneSetupState, ""); assert.strictEqual(contract.buildCarrierActivationCode("T-Mobile", selected.forwardToNumber), "");
});
test("logout or auth loss clears access to memory-only status", () => {
  const state = contract.createAuthenticatedForwardingState("a", valid);
  assert.strictEqual(contract.clearAuthenticatedForwardingState(state), null); assert.strictEqual(contract.selectAuthenticatedForwardingStatus(state, null), null); assert.ok(contextSource.includes("clearAuthenticatedForwardingState()"));
});
test("barber A destination cannot be used by barber B", () => {
  assert.strictEqual(contract.selectAuthenticatedForwardingStatus(contract.createAuthenticatedForwardingState("a", valid), "b"), null);
});
test("setup cannot dial with cached onboarding destination", () => {
  const cached = { forwardToNumber: "+18135550199" }; const authenticated = contract.selectAuthenticatedForwardingStatus(null, "a");
  assert.ok(cached.forwardToNumber); assert.strictEqual(contract.buildCarrierActivationCode("T-Mobile", authenticated?.forwardToNumber), "");
});
test("verification cannot start or restart with cached onboarding destination", () => {
  assert.strictEqual(contract.buildVerificationStartBody({ forwardFromNumber: "+12125550100", forwardToNumber: undefined }), null);
  assert.strictEqual(verify.exports.buildRestartPayload({ verificationSessionId: "s" }).forwardToNumber, undefined);
});
test("assigned authenticated destination enables dial behavior", () => {
  const selected = contract.selectAuthenticatedForwardingStatus(contract.createAuthenticatedForwardingState("a", valid), "a");
  assert.strictEqual(contract.getForwardingSetupControls(selected).canActivate, true); assert.strictEqual(contract.buildCarrierActivationCode("T-Mobile", selected.forwardToNumber), "**21*18135550199#");
});
test("pending retryable and terminal controls map from server state", () => {
  const p = contract.getForwardingSetupControls({ phoneSetupState: "provisioning" }); const r = contract.getForwardingSetupControls({ phoneSetupState: "provisioning_failed_retryable" }); const t = contract.getForwardingSetupControls({ phoneSetupState: "provisioning_failed_terminal" });
  assert.strictEqual(p.canCheckStatus, true); assert.strictEqual(r.canRetryProvisioning, true); assert.strictEqual(t.provisioningTerminal, true); assert.strictEqual(p.canActivate || r.canActivate || t.canActivate, false);
});
test("overlapping operations are rejected", () => {
  const lock = { current: "" }; assert.strictEqual(contract.beginExclusiveOperation(lock, "refresh"), true); assert.strictEqual(contract.beginExclusiveOperation(lock, "retry"), false); contract.endExclusiveOperation(lock, "retry"); assert.strictEqual(lock.current, "refresh"); contract.endExclusiveOperation(lock, "refresh"); assert.strictEqual(contract.beginExclusiveOperation(lock, "verification"), true);
});
test("new-number and port-existing behavior is unchanged", () => {
  assert.deepStrictEqual(plain(contract.buildNumberStrategyPayload({ strategy: "new_number" })), { strategy: "new_number" }); assert.deepStrictEqual(plain(contract.buildNumberStrategyPayload({ strategy: "port_existing", forwardFromNumber: "+12125550100" })), { strategy: "port_existing" });
});
test("leading-zero code remains a memory-only string", () => {
  assert.strictEqual(verify.exports.getVerificationCode({ verificationCode: "000042" }), "000042"); assert.strictEqual(verify.exports.getVerificationCode({ verificationCode: 42 }), ""); assert.strictEqual(contract.sanitizeGenericOnboardingData({ verificationCode: "000042" }).verificationCode, undefined);
});
console.log(`TOTAL ${passed} | PASS ${passed} | FAIL 0`);
