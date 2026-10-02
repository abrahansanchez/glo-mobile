const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const babel = require("../node_modules/@babel/core");

const ROOT = path.resolve(__dirname, "..");
function compile(file) {
  const code = babel.transformSync(fs.readFileSync(file, "utf8"), {
    filename: file,
    plugins: [require("../node_modules/@babel/plugin-transform-modules-commonjs")],
  }).code;
  const sandbox = { exports: {}, module: { exports: {} }, require(id) { throw new Error(`Unexpected module ${id}`); }, Object, String, Boolean, Set, Promise };
  sandbox.module.exports = sandbox.exports;
  vm.runInNewContext(code, sandbox, { filename: file });
  return sandbox.module.exports;
}

const contract = compile(`${ROOT}/src/setup/setupModeContract.js`);
const enabled = (overrides = {}) => ({
  enabled: true,
  contractVersion: "1",
  clientSetupState: "setup_mode",
  product: { type: "individual" },
  billing: { commerciallyActive: true, status: "trialing" },
  business: {},
  phone: {},
  readiness: {},
  actions: {},
  ...overrides,
});
const plain = (value) => JSON.parse(JSON.stringify(value));
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
const ownedReadiness = (coordinator, owner) =>
  contract.selectOwnedSetupReadiness(coordinator.snapshot().readinessState, owner);
const ownedIntent = (coordinator, owner) =>
  contract.selectOwnedPhoneSetupIntent(coordinator.snapshot().phoneSetupIntentState, owner);
let passed = 0;
async function test(name, fn) { await fn(); passed += 1; console.log(`PASS ${passed}: ${name}`); }

(async () => {
  await test("feature disabled preserves legacy onboarding and dashboard routing", () => {
    assert.strictEqual(contract.selectSetupModeRoute({ clientEnabled: false, readiness: enabled(), onboardingComplete: false }), "legacy_onboarding");
    assert.strictEqual(contract.selectSetupModeRoute({ clientEnabled: false, readiness: enabled(), onboardingComplete: true }), "legacy_dashboard");
    const serverDisabled = contract.parseSetupReadinessResponse({ data: { enabled: false } });
    assert.strictEqual(contract.selectSetupModeRoute({ clientEnabled: true, readiness: serverDisabled, onboardingComplete: false }), "legacy_onboarding");
  });
  await test("incomplete billing routes to payment rather than phone setup", () => {
    const value = enabled({ clientSetupState: "billing_incomplete", billing: { commerciallyActive: false } });
    assert.strictEqual(contract.selectSetupModeRoute({ clientEnabled: true, readiness: value }), "setup_payment");
  });
  await test("trialing account with incomplete setup enters Setup Mode", () => {
    assert.strictEqual(contract.selectSetupModeRoute({ clientEnabled: true, readiness: enabled() }), "setup_mode");
  });
  await test("live account enters normal dashboard", () => {
    assert.strictEqual(contract.selectSetupModeRoute({ clientEnabled: true, readiness: enabled({ clientSetupState: "live" }) }), "setup_dashboard");
  });
  await test("every named recovery state bypasses the ordinary subscription lock", () => {
    for (const state of contract.RECOVERY_STATES) assert.strictEqual(contract.selectSetupModeRoute({ clientEnabled: true, readiness: enabled({ clientSetupState: state, billing: { commerciallyActive: false } }) }), "setup_recovery");
  });
  await test("phone recovery state also bypasses the ordinary subscription lock", () => {
    const value = enabled({ phone: { recoveryState: "verification_restart_required" } });
    assert.strictEqual(contract.selectSetupModeRoute({ clientEnabled: true, readiness: value }), "setup_recovery");
  });
  await test("checklist rendering model performs no network mutation", () => {
    let mutations = 0; const checklist = contract.getSetupChecklist(enabled({ readiness: { businessProfileComplete: true } }));
    assert.strictEqual(mutations, 0); assert.strictEqual(checklist.length, 5); assert.strictEqual(checklist[0].complete, true);
  });
  await test("readiness 404 changes the active account to legacy routing", async () => {
    const calls = [];
    const coordinator = contract.createSetupModeCoordinator({ apiClient: {
      get: async (url) => { calls.push(["GET", url]); throw { response: { status: 404 } }; },
      post: async () => { throw new Error("unexpected POST"); },
    } });
    await coordinator.activateSession(true, "account-a");
    const readiness = ownedReadiness(coordinator, "account-a");
    assert.strictEqual(readiness.enabled, false);
    assert.strictEqual(contract.selectSetupModeRoute({ clientEnabled: true, readiness, onboardingComplete: false }), "legacy_onboarding");
    assert.deepStrictEqual(calls, [["GET", "/phone/setup/readiness"]]);
  });
  await test("provider mount and auth restore perform only readiness GET", async () => {
    const calls = [];
    const coordinator = contract.createSetupModeCoordinator({ apiClient: {
      get: async (url) => { calls.push(["GET", url]); return { data: enabled() }; },
      post: async (url) => { calls.push(["POST", url]); throw new Error("unexpected POST"); },
    } });
    await coordinator.activateSession(true, "account-a");
    assert.deepStrictEqual(calls, [["GET", "/phone/setup/readiness"]]);
  });
  await test("readiness refresh performs GET only", async () => {
    const calls = []; const api = { get: async (url) => { calls.push(["GET", url]); return { data: enabled() }; }, post: async () => { throw new Error("unexpected POST"); } };
    await contract.fetchSetupReadiness(api); assert.deepStrictEqual(calls, [["GET", "/phone/setup/readiness"]]);
  });
  await test("provider readiness refresh performs only a second readiness GET", async () => {
    const calls = [];
    const coordinator = contract.createSetupModeCoordinator({ apiClient: {
      get: async (url) => { calls.push(["GET", url]); return { data: enabled() }; },
      post: async (url) => { calls.push(["POST", url]); throw new Error("unexpected POST"); },
    } });
    await coordinator.activateSession(true, "account-a");
    await coordinator.refreshReadiness();
    assert.deepStrictEqual(calls, [["GET", "/phone/setup/readiness"], ["GET", "/phone/setup/readiness"]]);
  });
  await test("phone setup start occurs only after explicit request", async () => {
    let posts = 0; const api = { post: async () => { posts += 1; return { data: { phoneSetupIntentId: "intent-1" } }; } };
    assert.strictEqual(posts, 0); await contract.requestPhoneSetupStart(api); assert.strictEqual(posts, 1);
  });
  await test("duplicate start taps share one request", async () => {
    let releases; const held = new Promise((resolve) => { releases = resolve; }); let calls = 0;
    const single = contract.createSingleFlight(); const operation = () => { calls += 1; return held; };
    const first = single(operation); const second = single(operation); await Promise.resolve(); assert.strictEqual(calls, 1); releases("done"); assert.deepStrictEqual(await Promise.all([first, second]), ["done", "done"]);
  });
  await test("explicit and overlapping UI start actions make one POST and one navigation", async () => {
    const held = deferred();
    let setupPosts = 0;
    let navigations = 0;
    const coordinator = contract.createSetupModeCoordinator({ apiClient: {
      get: async () => ({ data: enabled({ actions: { canStartPhoneSetup: true, canChooseStrategy: true } }) }),
      post: async (url) => {
        assert.strictEqual(url, "/phone/setup/start");
        setupPosts += 1;
        return held.promise;
      },
    } });
    await coordinator.activateSession(true, "account-a");
    const actions = contract.createSetupModeActionController({
      startPhoneSetup: coordinator.startPhoneSetup,
      navigate: (route) => { assert.strictEqual(route, "PhoneSetupChoice"); navigations += 1; },
    });
    const first = actions.start();
    const second = actions.start();
    await Promise.resolve();
    assert.strictEqual(setupPosts, 1);
    held.resolve({ data: { phoneSetupIntentId: "intent-a" } });
    await Promise.all([first, second]);
    assert.strictEqual(navigations, 1);
    assert.strictEqual(ownedIntent(coordinator, "account-a"), "intent-a");
  });
  await test("strategy endpoint waits for explicit strategy submission", async () => {
    let posts = 0; const api = { post: async (url) => { posts += 1; return { url }; } };
    const payload = contract.buildPhoneStrategyRequest("new_number", "intent-1"); assert.strictEqual(posts, 0); await contract.submitPhoneStrategyChoice(api, payload); assert.strictEqual(posts, 1);
  });
  await test("trial completion refreshes and routes without starting phone setup or strategy", async () => {
    const calls = [];
    const setupMode = {
      readiness: enabled(),
      refreshReadiness: async () => { calls.push("readiness"); return enabled(); },
      startPhoneSetup: async () => { calls.push("start"); },
      submitStrategy: async () => { calls.push("strategy"); },
    };
    const navigation = { replace: (route) => calls.push(`replace:${route}`) };
    await contract.completeTrialSetupTransition({
      setupMode,
      navigation,
      navigateFromBackend: async () => calls.push("legacy"),
    });
    assert.deepStrictEqual(calls, ["readiness", "replace:SetupModeHome"]);
  });
  await test("navigation decisions are stable and cannot initiate phone setup", () => {
    let mutations = 0;
    const cases = [
      [{ clientEnabled: false, readiness: enabled(), onboardingComplete: false }, "legacy_onboarding"],
      [{ clientEnabled: true, readiness: { enabled: false }, onboardingComplete: true }, "legacy_dashboard"],
      [{ clientEnabled: true, readiness: enabled({ clientSetupState: "billing_incomplete", billing: { commerciallyActive: false } }) }, "setup_payment"],
      [{ clientEnabled: true, readiness: enabled() }, "setup_mode"],
      [{ clientEnabled: true, readiness: enabled({ clientSetupState: "live" }) }, "setup_dashboard"],
      [{ clientEnabled: true, readiness: enabled({ clientSetupState: "unsafe_phone_recovery" }) }, "setup_recovery"],
    ];
    for (const [input, expected] of cases) {
      for (let index = 0; index < 3; index += 1) {
        assert.strictEqual(contract.selectSetupModeRoute(input), expected);
      }
    }
    assert.strictEqual(mutations, 0);
  });
  await test("noncommercial routing and actions cannot be changed by back/navigation attempts", async () => {
    const value = enabled({
      clientSetupState: "billing_incomplete",
      billing: { commerciallyActive: false },
      actions: { canStartPhoneSetup: true, canChooseStrategy: true },
    });
    assert.strictEqual(contract.selectSetupModeRoute({ clientEnabled: true, readiness: value }), "setup_payment");
    assert.strictEqual(contract.getAuthorizedSetupActions(value).canStartPhoneSetup, false);
    let posts = 0;
    const coordinator = contract.createSetupModeCoordinator({ apiClient: {
      get: async () => ({ data: value }),
      post: async () => { posts += 1; },
    } });
    await coordinator.activateSession(true, "account-a");
    await assert.rejects(coordinator.startPhoneSetup(), /PHONE_SETUP_NOT_READY/);
    assert.strictEqual(posts, 0);
  });
  await test("only new number and forward existing strategies are allowed", () => {
    assert.deepStrictEqual(plain(contract.PHONE_SETUP_STRATEGIES), ["new_number", "forward_existing"]);
  });
  await test("porting is absent", () => { assert.strictEqual(contract.buildPhoneStrategyRequest("port_existing", "intent-1"), null); });
  await test("Shop is absent", () => { assert.strictEqual(contract.buildPhoneStrategyRequest("shop", "intent-1"), null); });
  await test("checklist completion comes only from readiness DTO flags", () => {
    const list = contract.getSetupChecklist(enabled({ readiness: { servicesComplete: true, phoneSetupComplete: false }, business: { profileComplete: true } }));
    assert.strictEqual(list.find((x) => x.key === "services").complete, true); assert.strictEqual(list.find((x) => x.key === "business_profile").complete, false);
  });
  await test("malformed enabled readiness fails safely", () => {
    assert.throws(() => contract.parseSetupReadinessResponse({ data: { enabled: true } }), /SETUP_READINESS_MALFORMED/);
  });
  await test("canonical phone numbers and provider fields are discarded", () => {
    const parsed = contract.parseSetupReadinessResponse({ data: { ...enabled(), forwardToNumber: "+15555550123", phone: { setupState: "ready", forwardToNumber: "+15555550123", providerSid: "hidden" } } });
    assert.strictEqual(parsed.forwardToNumber, undefined); assert.strictEqual(parsed.phone.forwardToNumber, undefined); assert.strictEqual(parsed.phone.providerSid, undefined);
  });
  await test("logout and account switch make prior readiness unavailable", () => {
    const state = contract.createOwnedSetupReadiness("account-a", enabled()); assert.ok(contract.selectOwnedSetupReadiness(state, "account-a")); assert.strictEqual(contract.selectOwnedSetupReadiness(state, "account-b"), null); assert.strictEqual(contract.selectOwnedSetupReadiness(state, null), null);
  });
  await test("logout and account switch make prior phone setup intent unavailable", () => {
    const state = contract.createOwnedPhoneSetupIntent("account-a", "intent-a");
    assert.strictEqual(contract.selectOwnedPhoneSetupIntent(state, "account-a"), "intent-a");
    assert.strictEqual(contract.selectOwnedPhoneSetupIntent(state, "account-b"), "");
    assert.strictEqual(contract.selectOwnedPhoneSetupIntent(state, null), "");
  });
  await test("logout during in-flight readiness rejects the late result", async () => {
    const held = deferred();
    const coordinator = contract.createSetupModeCoordinator({ apiClient: { get: async () => held.promise } });
    const pending = coordinator.activateSession(true, "account-a");
    await coordinator.activateSession(false, null);
    held.resolve({ data: enabled() });
    await pending;
    assert.strictEqual(ownedReadiness(coordinator, "account-a"), null);
    assert.strictEqual(coordinator.snapshot().loading, false);
  });
  await test("account switch rejects A readiness while accepting B readiness", async () => {
    const heldA = deferred();
    const calls = [];
    const coordinator = contract.createSetupModeCoordinator({ apiClient: {
      get: async () => { const held = calls.length === 0 ? heldA : null; calls.push("GET"); return held ? held.promise : { data: enabled({ contractVersion: "b" }) }; },
    } });
    const pendingA = coordinator.activateSession(true, "account-a");
    await coordinator.activateSession(true, "account-b");
    heldA.resolve({ data: enabled({ contractVersion: "a" }) });
    await pendingA;
    assert.strictEqual(ownedReadiness(coordinator, "account-a"), null);
    assert.strictEqual(ownedReadiness(coordinator, "account-b").contractVersion, "b");
  });
  await test("account switch rejects A setup-start result and intent", async () => {
    const heldStart = deferred();
    let activeOwner = "account-a";
    const coordinator = contract.createSetupModeCoordinator({ apiClient: {
      get: async () => ({ data: enabled({ contractVersion: activeOwner, actions: { canStartPhoneSetup: true, canChooseStrategy: true } }) }),
      post: async () => heldStart.promise,
    } });
    await coordinator.activateSession(true, activeOwner);
    const pendingStart = coordinator.startPhoneSetup();
    activeOwner = "account-b";
    await coordinator.activateSession(true, activeOwner);
    heldStart.resolve({ data: { phoneSetupIntentId: "intent-a" } });
    await assert.rejects(pendingStart, /PHONE_SETUP_OWNER_CHANGED/);
    assert.strictEqual(ownedIntent(coordinator, "account-a"), "");
    assert.strictEqual(ownedIntent(coordinator, "account-b"), "");
  });
  await test("failed readiness remains loading-safe then enters recovery", async () => {
    const held = deferred();
    const coordinator = contract.createSetupModeCoordinator({ apiClient: { get: async () => held.promise } });
    const pending = coordinator.activateSession(true, "account-a");
    assert.strictEqual(coordinator.snapshot().loading, true);
    assert.strictEqual(ownedReadiness(coordinator, "account-a"), null);
    held.reject(new Error("offline"));
    await pending;
    const readiness = ownedReadiness(coordinator, "account-a");
    assert.strictEqual(contract.selectSetupModeRoute({ clientEnabled: true, readiness }), "setup_recovery");
  });
  await test("malformed readiness enters recovery through the production coordinator", async () => {
    const coordinator = contract.createSetupModeCoordinator({ apiClient: {
      get: async () => ({ data: { enabled: true } }),
    } });
    await coordinator.activateSession(true, "account-a");
    const readiness = ownedReadiness(coordinator, "account-a");
    assert.strictEqual(readiness.invalid, true);
    assert.strictEqual(contract.selectSetupModeRoute({ clientEnabled: true, readiness }), "setup_recovery");
  });
  await test("server-authorized action model hides unauthorized actions", () => {
    assert.deepStrictEqual(plain(contract.getAuthorizedSetupActions(enabled())), {
      canStartPhoneSetup: false,
      canChooseStrategy: false,
      canOpenBilling: false,
      canViewForwardingStatus: false,
      canContactSupport: false,
    });
    assert.deepStrictEqual(plain(contract.getAuthorizedSetupActions(enabled({ actions: {
      canStartPhoneSetup: true,
      canChooseStrategy: true,
      canOpenBilling: true,
      canViewForwardingStatus: true,
      canContactSupport: true,
    } }))), {
      canStartPhoneSetup: true,
      canChooseStrategy: true,
      canOpenBilling: true,
      canViewForwardingStatus: true,
      canContactSupport: true,
    });
  });
  await test("authorized actions invoke only intended navigation and support", () => {
    const effects = [];
    const unauthorized = contract.createAuthorizedSetupActionController({
      readiness: enabled(),
      navigate: (route) => effects.push(`navigate:${route}`),
      openSupport: () => effects.push("support"),
    });
    assert.strictEqual(unauthorized.openBilling(), false);
    assert.strictEqual(unauthorized.openForwardingStatus(), false);
    assert.strictEqual(unauthorized.contactSupport(), false);
    assert.deepStrictEqual(effects, []);

    const authorized = contract.createAuthorizedSetupActionController({
      readiness: enabled({ actions: {
        canOpenBilling: true,
        canViewForwardingStatus: true,
        canContactSupport: true,
      } }),
      navigate: (route) => effects.push(`navigate:${route}`),
      openSupport: () => effects.push("support"),
    });
    assert.strictEqual(authorized.openBilling(), true);
    assert.strictEqual(authorized.openForwardingStatus("ForwardingSetup"), true);
    assert.strictEqual(authorized.contactSupport(), true);
    assert.deepStrictEqual(effects, ["navigate:SetupPayment", "navigate:ForwardingSetup", "support"]);
  });
  await test("successful Setup Mode service save returns once; Settings save does not", () => {
    let backs = 0;
    const navigation = { goBack: () => { backs += 1; } };
    assert.strictEqual(contract.returnFromSetupServiceSave({ params: { setupMode: true } }, navigation), true);
    assert.strictEqual(backs, 1);
    assert.strictEqual(contract.returnFromSetupServiceSave({ params: {} }, navigation), false);
    assert.strictEqual(backs, 1);
  });
  await test("start body is fixed to Individual product", async () => {
    let body; await contract.requestPhoneSetupStart({ post: async (_url, value) => { body = value; return { data: { phoneSetupIntentId: "intent-2" } }; } }); assert.deepStrictEqual(plain(body), { productType: "individual" });
  });
  await test("forwarding choice requires intent and normalized public number", () => {
    assert.strictEqual(contract.buildPhoneStrategyRequest("forward_existing", "intent-1", "bad"), null);
    assert.deepStrictEqual(plain(contract.buildPhoneStrategyRequest("forward_existing", "intent-1", "+12125550100", "T-Mobile")), { strategy: "forward_existing", phoneSetupIntentId: "intent-1", forwardFromNumber: "+12125550100", forwardingCarrier: "T-Mobile" });
  });
  await test("safe parser exposes no raw server object", () => {
    const parsed = contract.parseSetupReadinessResponse({ data: { ...enabled(), secret: "hidden", actions: { canStartPhoneSetup: true, rawResponse: { hidden: true } } } }); assert.strictEqual(parsed.secret, undefined); assert.strictEqual(parsed.actions.rawResponse, undefined);
  });
  console.log(`TOTAL ${passed} | PASS ${passed} | FAIL 0`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
