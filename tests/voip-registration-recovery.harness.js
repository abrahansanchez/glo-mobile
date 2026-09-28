#!/usr/bin/env node
"use strict";

/*
 * Deterministic Lane A harness for auth and voice-registration recovery.
 * It executes the checked-in production modules with import-boundary mocks;
 * it never contacts Expo, Twilio, Render, Mongo, or any other external service.
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Babel = require("@babel/core");

const ROOT = path.resolve(__dirname, "..");
const SERVICE_FILE = path.join(ROOT, "src/voice/voipPushService.js");
const AUTH_FILE = path.join(ROOT, "src/auth/authContext.js");
const PUSH_FILE = path.join(ROOT, "src/notifications/pushNotifications.js");

class FakeClock {
  constructor() {
    this.now = 0;
    this.nextId = 1;
    this.jobs = new Map();
  }

  setTimeout(fn, delay = 0) {
    const id = this.nextId++;
    this.jobs.set(id, { id, at: this.now + Number(delay || 0), fn });
    return id;
  }

  clearTimeout(id) {
    this.jobs.delete(id);
  }

  async advance(ms) {
    const end = this.now + ms;
    while (true) {
      const due = [...this.jobs.values()]
        .filter((job) => job.at <= end)
        .sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) break;
      this.jobs.delete(due.id);
      this.now = due.at;
      await due.fn();
      await flush();
    }
    this.now = end;
  }

  pending() {
    return this.jobs.size;
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flush(turns = 12) {
  for (let i = 0; i < turns; i += 1) await Promise.resolve();
}

function createLogger() {
  const entries = [];
  const record = (level) => (...args) => entries.push({ level, args });
  return {
    entries,
    console: { log: record("log"), error: record("error"), warn: record("warn") },
    text() {
      return entries.map(({ args }) => args.map(printable).join(" ")).join("\n");
    },
  };
}

function printable(value) {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch (_) { return String(value); }
}

function compileModule(filename, mocks, globals = {}) {
  const source = fs.readFileSync(filename, "utf8");
  const transformed = Babel.transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    plugins: [
      "@babel/plugin-transform-react-jsx",
      "@babel/plugin-transform-modules-commonjs",
    ],
  }).code;
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (Object.prototype.hasOwnProperty.call(mocks, specifier)) return mocks[specifier];
    throw new Error(`Unmocked import ${specifier} while loading ${path.relative(ROOT, filename)}`);
  };
  const names = ["require", "module", "exports", "__filename", "__dirname", ...Object.keys(globals)];
  const values = [localRequire, module, module.exports, filename, path.dirname(filename), ...Object.values(globals)];
  new Function(...names, transformed)(...values);
  return module.exports;
}

function createNativeMock() {
  const listeners = new Map();
  const initCalls = [];
  let initImpl = async () => ({ initialized: true });
  const native = {
    addEventListener(name, handler) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(handler);
      return { remove: () => listeners.get(name)?.delete(handler) };
    },
    emit(name, payload) {
      for (const handler of listeners.get(name) || []) handler(payload);
    },
    initWithToken(token) {
      initCalls.push(token);
      return initImpl(token, initCalls.length);
    },
    configureCallKit() {},
    unregisterCalls: 0,
    unregister() { native.unregisterCalls += 1; },
    accept() {}, reject() {}, ignore() {},
    setInitImpl(fn) { initImpl = fn; },
    listenerCount(name) { return (listeners.get(name) || new Set()).size; },
  };
  // Test inspection state must not alter the enumerable shape of the mocked SDK
  // object that production diagnostics log.
  Object.defineProperty(native, "initCalls", { value: initCalls, enumerable: false });
  return native;
}

function createAppState() {
  const handlers = new Set();
  return {
    currentState: "active",
    addEventListener(name, handler) {
      assert.equal(name, "change");
      handlers.add(handler);
      return { remove: () => handlers.delete(handler) };
    },
    emit(state) { for (const handler of handlers) handler(state); },
    listenerCount() { return handlers.size; },
  };
}

function makeService(options = {}) {
  const clock = new FakeClock();
  const logger = createLogger();
  const native = createNativeMock();
  const appState = createAppState();
  let barber = options.barber || { _id: "A" };
  let tokenImpl = options.fetchVoiceToken || (async () => ({ token: "voice-secret-A", identity: "A" }));
  native.setInitImpl(options.initWithToken || (async () => ({ initialized: true })));
  const service = compileModule(SERVICE_FILE, {
    "react-native-twilio-programmable-voice": { __esModule: true, default: native },
    "react-native": { AppState: appState, Platform: { OS: "ios" } },
    "./voiceTokenService": { fetchVoiceToken: (...args) => tokenImpl(...args) },
    "../auth/barberStorage": { getBarber: () => typeof barber === "function" ? barber() : Promise.resolve(barber) },
  }, {
    console: logger.console,
    setTimeout: clock.setTimeout.bind(clock),
    clearTimeout: clock.clearTimeout.bind(clock),
  });
  return {
    service, native, clock, logger, appState,
    setBarber(value) { barber = value; },
    setTokenImpl(fn) { tokenImpl = fn; },
  };
}

function createHookHost() {
  const effects = [];
  const states = [];
  const refs = [];
  let stateCursor = 0;
  let refCursor = 0;
  const contexts = [];
  const React = {
    createContext() {
      const context = { value: undefined };
      context.Provider = ({ value, children }) => { context.value = value; return children; };
      contexts.push(context);
      return context;
    },
    createElement(type, props, ...children) {
      const merged = { ...(props || {}), children: children.length <= 1 ? children[0] : children };
      return typeof type === "function" ? type(merged) : { type, props: merged };
    },
    useState(initial) {
      const index = stateCursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    },
    useRef(initial) {
      const index = refCursor++;
      if (!refs[index]) refs[index] = { current: initial };
      return refs[index];
    },
    useCallback(fn) { return fn; },
    useEffect(fn) { effects.push(fn); },
  };
  return {
    React,
    effects,
    contexts,
    beginRender() { stateCursor = 0; refCursor = 0; effects.length = 0; },
    async runEffects() {
      const cleanups = [];
      for (const effect of [...effects]) {
        const result = effect();
        if (typeof result === "function") cleanups.push(result);
      }
      await flush(30);
      return cleanups;
    },
  };
}

async function exerciseAuth({
  storedToken = null,
  storedBarber = null,
  loginResponse = null,
  pushModule = null,
  onBarberChange = null,
  events = [],
  runInitialEffects = true,
} = {}) {
  const hooks = createHookHost();
  const voipCalls = [];
  const invalidations = [];
  const pushCalls = [];
  const pushPromises = [];
  const store = { token: storedToken, barber: storedBarber };
  const unauthorized = { handler: null };
  const api = {
    defaults: { headers: { common: {} } },
    async get(route) { assert.equal(route, "/billing/status"); return { data: { subscriptionStatus: "active" } }; },
    async post(route) { assert.equal(route, "/auth/login"); return loginResponse; },
  };
  const logger = createLogger();
  const appState = createAppState();
  const exports = compileModule(AUTH_FILE, {
    react: hooks.React,
    "react-native": { AppState: appState },
    "./tokenStorage": {
      getToken: async () => store.token,
      saveToken: async (token) => { store.token = token; },
      clearToken: async () => { store.token = null; },
    },
    "../config/api": { __esModule: true, default: api },
    "./authEvents": {
      setOnUnauthorized: (handler) => { unauthorized.handler = handler; },
      setOnSubscriptionRequired() {},
    },
    "./barberStorage": {
      saveBarber: async (barber) => {
        events.push(`saveBarber:${barber?._id || barber?.id || "missing"}`);
        store.barber = barber;
        onBarberChange?.(barber);
      },
      getBarber: async () => store.barber,
      clearBarber: async () => {
        events.push("clearBarber");
        store.barber = null;
        onBarberChange?.(null);
      },
    },
    "../voice/voipPushService": {
      initVoipPushAndRegisterOnce: async (...args) => { voipCalls.push(args); return { started: true }; },
      invalidateVoipRegistrationSession: (reason) => invalidations.push(reason),
    },
    "../notifications/pushNotifications": {
      registerExpoPushTokenIfNeeded: async (...args) => {
        pushCalls.push(["acquire", ...args]);
        const promise = Promise.resolve(pushModule?.registerExpoPushTokenIfNeeded(...args));
        pushPromises.push(promise);
        return promise;
      },
      registerProvidedExpoPushTokenIfNeeded: async (...args) => {
        pushCalls.push(["provided", ...args]);
        const promise = Promise.resolve(pushModule?.registerProvidedExpoPushTokenIfNeeded(...args));
        pushPromises.push(promise);
        return promise;
      },
      setupPushTokenRefreshRegistration: () => () => {},
    },
    "../analytics/track": { setAnalyticsContext() {} },
  }, { console: logger.console, React: hooks.React });
  hooks.beginRender();
  exports.AuthProvider({ children: null });
  const cleanups = runInitialEffects ? await hooks.runEffects() : [];
  return {
    exports, hooks, voipCalls, invalidations, pushCalls, pushPromises, store, unauthorized, cleanups,
    context: () => exports.AuthContext.value,
  };
}

function makePushHarness() {
  const secure = new Map();
  const posts = [];
  const logger = createLogger();
  const token = "ExponentPushToken[expo-complete-secret]";
  let barber = { _id: "A" };
  let postImpl = async () => ({ data: { ok: true } });
  const Notifications = {
    async getPermissionsAsync() { return { status: "granted" }; },
    async requestPermissionsAsync() { return { status: "granted" }; },
    async getExpoPushTokenAsync() { return { data: token }; },
    async getDevicePushTokenAsync() { return { data: "apns-complete-secret" }; },
    addPushTokenListener() { return { remove() {} }; },
    setNotificationHandler() {},
    addNotificationReceivedListener() { return { remove() {} }; },
    addNotificationResponseReceivedListener() { return { remove() {} }; },
  };
  const push = compileModule(PUSH_FILE, {
    "expo-notifications": Notifications,
    "expo-device": { isDevice: true },
    "expo-constants": { __esModule: true, default: { easConfig: { projectId: "project" } } },
    "expo-secure-store": {
      getItemAsync: async (key) => secure.get(key) || null,
      setItemAsync: async (key, value) => { secure.set(key, value); },
    },
    "../auth/barberStorage": { getBarber: async () => barber },
    "../config/api": {
      __esModule: true,
      default: {
        post: async (...args) => {
          posts.push(args);
          return postImpl(...args);
        },
      },
    },
  }, { console: logger.console, setTimeout });
  return {
    push, posts, logger, token, secure,
    setBarber(value) { barber = value; },
    setPostImpl(value) { postImpl = value; },
  };
}

const tests = [];
function test(group, name, fn, kind = "required") { tests.push({ group, name, fn, kind }); }

test("auth restore", "stored A requests A once and native readiness is event-owned", async () => {
  const auth = await exerciseAuth({ storedToken: "jwt-A", storedBarber: { _id: "A" } });
  assert.deepEqual(auth.voipCalls, [["auth_restore", "A"]]);
  const env = makeService();
  const started = await env.service.initVoipPushAndRegisterOnce("auth_restore", "A");
  assert.equal(started.started, true);
  assert.equal(env.service.isVoipDeviceReady(), false);
  env.native.emit("deviceReady");
  assert.equal(env.service.isVoipDeviceReady(), true);
  env.service.invalidateVoipRegistrationSession("cleanup");
  assert.equal(env.clock.pending(), 0);
});

test("login", "login activates exact identity and duplicate registration dedupes", async () => {
  const auth = await exerciseAuth({ loginResponse: { data: { token: "jwt-A", barber: { id: "A" } } } });
  await auth.context().login("a@example.invalid", "not-a-real-password");
  assert.deepEqual(auth.invalidations, ["login_account_activation"]);
  assert.deepEqual(auth.voipCalls, [["login", "A"]]);
  const gate = deferred();
  const env = makeService({ initWithToken: () => gate.promise });
  const first = env.service.initVoipPushAndRegisterOnce("login", "A");
  await flush();
  const second = env.service.initVoipPushAndRegisterOnce("duplicate", "A");
  assert.equal(env.native.initCalls.length, 1);
  gate.resolve({ initialized: true });
  assert.deepEqual(await first, await second);
  env.service.invalidateVoipRegistrationSession("cleanup");
});

test("logout", "invalidation clears readiness, queues, timers, and rejects late ownership", async () => {
  const env = makeService();
  await env.service.initVoipPushAndRegisterOnce("login", "A");
  env.native.emit("deviceDidReceiveIncoming", { callSid: "CA-A" });
  env.service.invalidateVoipRegistrationSession("logout");
  assert.equal(env.service.isVoipDeviceReady(), false);
  assert.equal(env.clock.pending(), 1, "blocked-state diagnostic is the only bounded timer");
  env.native.emit("deviceReady");
  assert.equal(env.service.isVoipDeviceReady(), false);
  assert.equal(env.native.unregisterCalls, 1);
  await env.clock.advance(10000);
  assert.equal(env.clock.pending(), 0);
});

test("global 401", "auth invalidates once and old identity cannot recover", async () => {
  const auth = await exerciseAuth({ storedToken: "jwt-A", storedBarber: { _id: "A" } });
  await auth.unauthorized.handler();
  assert.deepEqual(auth.invalidations, ["unauthorized"]);
  assert.equal(auth.store.token, null);
  assert.equal(auth.store.barber, null);
  const env = makeService();
  await env.service.initVoipPushAndRegisterOnce("auth_restore", "A");
  env.service.invalidateVoipRegistrationSession("unauthorized");
  env.native.emit("deviceReady");
  assert.equal(env.service.isVoipDeviceReady(), false);
  const result = await env.service.initVoipPushAndRegisterOnce("recovery", "A");
  assert.equal(result.recoveryRequired, true);
  await env.clock.advance(10000);
});

test("account switch", "A pre-native completion cannot own B and identity mismatch fails closed", async () => {
  const tokenGate = deferred();
  const env = makeService({ fetchVoiceToken: () => tokenGate.promise });
  const old = env.service.initVoipPushAndRegisterOnce("login", "A");
  env.service.invalidateVoipRegistrationSession("switch");
  env.setTokenImpl(async () => ({ token: "voice-secret-B", identity: "B" }));
  env.setBarber({ _id: "B" });
  const next = await env.service.initVoipPushAndRegisterOnce("login", "B");
  assert.equal(next.started, true);
  tokenGate.resolve({ token: "voice-secret-A", identity: "A" });
  assert.equal((await old).obsolete, true);
  assert.equal(env.native.initCalls.length, 1);
  env.service.invalidateVoipRegistrationSession("cleanup");
  await env.clock.advance(10000);

  const mismatch = makeService({ fetchVoiceToken: async () => ({ token: "voice-secret-A", identity: "A" }), barber: { _id: "B" } });
  await assert.rejects(mismatch.service.initVoipPushAndRegisterOnce("login", "B"), /does not match/);
  assert.equal(mismatch.native.initCalls.length, 0);
});

test("account switch", "invite queued under A is never delivered to B", async () => {
  const env = makeService();
  const received = [];
  env.service.onVoipIncomingInvite((invite) => received.push(invite));
  await env.service.initVoipPushAndRegisterOnce("login", "A");
  env.native.emit("deviceDidReceiveIncoming", { callSid: "CA-A" });
  env.service.invalidateVoipRegistrationSession("switch");
  env.native.emit("deviceReady");
  assert.deepEqual(received, []);
  await env.clock.advance(10000);
});

test("Expo ownership", "same owner and device token remain deduplicated", async () => {
  const env = makePushHarness();
  const gate = deferred();
  env.setPostImpl(() => gate.promise);
  const first = env.push.registerExpoPushTokenIfNeeded("A");
  const concurrent = env.push.registerExpoPushTokenIfNeeded("A");
  await flush();
  assert.equal(env.posts.length, 1);
  gate.resolve({ data: { ok: true } });
  await Promise.all([first, concurrent]);
  await env.push.registerExpoPushTokenIfNeeded("A");
  assert.equal(env.posts.length, 1);
}, "characterization");

test("Expo ownership", "account switch must register the same device token for the new owner", async () => {
  const env = makePushHarness();
  await env.push.registerExpoPushTokenIfNeeded("A");
  env.setBarber({ _id: "B" });
  await env.push.registerExpoPushTokenIfNeeded("B");
  assert.equal(env.posts.length, 2, "registration cache lacks barber/account ownership");
  assert.equal(env.secure.get("expoPushOwner"), "B");
});

test("retry", "token failure and native throw each allow a later retry", async () => {
  let tokenAttempts = 0;
  const env = makeService({ fetchVoiceToken: async () => {
    tokenAttempts += 1;
    if (tokenAttempts === 1) throw Object.assign(new Error("unauthorized"), { response: { status: 401 } });
    return { token: "voice-secret-A", identity: "A" };
  }});
  await assert.rejects(env.service.initVoipPushAndRegisterOnce("restore", "A"), /unauthorized/);
  assert.equal((await env.service.initVoipPushAndRegisterOnce("login", "A")).started, true);
  env.service.invalidateVoipRegistrationSession("cleanup");
  await env.clock.advance(10000);

  let nativeAttempts = 0;
  const nativeFail = makeService({ initWithToken: async () => {
    nativeAttempts += 1;
    if (nativeAttempts === 1) throw new Error("native failed");
    return { initialized: true };
  }});
  await assert.rejects(nativeFail.service.initVoipPushAndRegisterOnce("first", "A"), /native failed/);
  assert.equal((await nativeFail.service.initVoipPushAndRegisterOnce("second", "A")).started, true);
  nativeFail.service.invalidateVoipRegistrationSession("cleanup");
  await nativeFail.clock.advance(10000);
});

test("retry", "watchdog retries once and deviceReady cancels it", async () => {
  const env = makeService();
  await env.service.initVoipPushAndRegisterOnce("login", "A");
  await env.clock.advance(10000);
  assert.equal(env.native.initCalls.length, 2);
  await env.clock.advance(60000);
  assert.equal(env.native.initCalls.length, 2);
  env.native.emit("deviceReady");
  assert.equal(env.clock.pending(), 0);
  env.service.invalidateVoipRegistrationSession("cleanup");

  const ready = makeService();
  await ready.service.initVoipPushAndRegisterOnce("login", "A");
  ready.native.emit("deviceReady");
  assert.equal(ready.clock.pending(), 0);
  await ready.clock.advance(20000);
  assert.equal(ready.native.initCalls.length, 1);
  ready.service.invalidateVoipRegistrationSession("cleanup");
});

test("retry", "deviceNotReady with multiple operations enters deterministic block", async () => {
  const env = makeService();
  await env.service.initVoipPushAndRegisterOnce("login", "A");
  await env.clock.advance(10000);
  env.native.emit("deviceNotReady", { error: "failed" });
  assert.equal(env.service.getVoipRegistrationRecoveryState().blocked, true);
  assert.equal(env.service.isVoipDeviceReady(), false);
  assert.equal((await env.service.initVoipPushAndRegisterOnce("same", "A")).recoveryRequired, true);
  env.native.emit("deviceReady");
  assert.equal(env.service.isVoipDeviceReady(), false);
  await env.clock.advance(10000);
});

test("retry", "one old failure cannot release watchdog-retry ownership to a replacement", async () => {
  const env = makeService();
  await env.service.initVoipPushAndRegisterOnce("login", "A");
  await env.clock.advance(10000);
  assert.equal(env.native.initCalls.length, 2);
  env.native.emit("deviceNotReady", { error: "one-old-operation-failed" });
  env.service.invalidateVoipRegistrationSession("account-switch");
  env.setTokenImpl(async () => ({ token: "voice-secret-B", identity: "B" }));
  env.setBarber({ _id: "B" });
  const replacement = await env.service.initVoipPushAndRegisterOnce("login", "B");
  assert.equal(replacement.recoveryRequired, true);
  assert.equal(env.native.initCalls.length, 2, "B must not start while old callbacks are untagged");
  env.native.emit("deviceReady");
  env.native.emit("deviceNotReady", { error: "second-old-operation-failed" });
  assert.equal(env.service.isVoipDeviceReady(), false);
  await env.clock.advance(10000);
});

for (const boundary of ["token fetch", "barber lookup", "native initialization"]) {
  test("stale continuation", `invalidation during ${boundary} cannot continue or become ready`, async () => {
    const tokenGate = deferred();
    const barberGate = deferred();
    const nativeGate = deferred();
    const env = makeService({
      fetchVoiceToken: boundary === "token fetch" ? () => tokenGate.promise : async () => ({ token: "voice-secret-A", identity: "A" }),
      barber: boundary === "barber lookup" ? () => barberGate.promise : { _id: "A" },
      initWithToken: boundary === "native initialization" ? () => nativeGate.promise : async () => ({ initialized: true }),
    });
    const pending = env.service.initVoipPushAndRegisterOnce("login", "A");
    await flush();
    env.service.invalidateVoipRegistrationSession("boundary-test");
    if (boundary === "token fetch") tokenGate.resolve({ token: "voice-secret-A", identity: "A" });
    if (boundary === "barber lookup") barberGate.resolve({ _id: "A" });
    if (boundary === "native initialization") nativeGate.resolve({ initialized: true });
    const result = await pending;
    assert.equal(result.obsolete, true);
    env.native.emit("deviceReady");
    assert.equal(env.service.isVoipDeviceReady(), false);
    if (boundary !== "native initialization") assert.equal(env.native.initCalls.length, 0);
    await env.clock.advance(10000);
  });
}

test("stale continuation", "different identity cannot share an active attempt", async () => {
  const gate = deferred();
  const env = makeService({ fetchVoiceToken: () => gate.promise });
  const old = env.service.initVoipPushAndRegisterOnce("A", "A");
  const result = await env.service.initVoipPushAndRegisterOnce("B", "B");
  assert.equal(result.invalidationRequired, true);
  gate.resolve({ token: "voice-secret-A", identity: "A" });
  await old;
  env.service.invalidateVoipRegistrationSession("cleanup");
  await env.clock.advance(10000);
});

test("blocked recovery", "invalidation after native start is observable and blocks every operation", async () => {
  const env = makeService();
  await env.service.initVoipPushAndRegisterOnce("login", "A");
  env.service.invalidateVoipRegistrationSession("switch");
  assert.deepEqual(env.service.getVoipRegistrationRecoveryState(), {
    blocked: true,
    reason: "native_ownership_ambiguous",
    blockedAttemptId: 1,
    hasBlockedIdentity: true,
  });
  const next = await env.service.initVoipPushAndRegisterOnce("login", "B");
  assert.equal(next.recoveryRequired, true);
  assert.equal(env.native.initCalls.length, 1);
  env.native.emit("deviceReady");
  env.native.emit("deviceNotReady", { error: "late" });
  assert.equal(env.service.isVoipDeviceReady(), false);
  await env.clock.advance(10000);
  assert.equal(env.clock.pending(), 0);
});

test("module reset", "fresh process registers once; repeated restore does not storm", async () => {
  const first = makeService();
  await first.service.initVoipPushAndRegisterOnce("restore", "A");
  await first.service.initVoipPushAndRegisterOnce("restore-again", "A");
  assert.equal(first.native.initCalls.length, 1);
  first.native.emit("deviceReady");
  first.service.invalidateVoipRegistrationSession("cleanup");

  const relaunched = makeService();
  const result = await relaunched.service.initVoipPushAndRegisterOnce("restore", "A");
  assert.equal(result.started, true);
  assert.equal(relaunched.native.initCalls.length, 1);
  relaunched.native.emit("deviceReady");
  relaunched.service.invalidateVoipRegistrationSession("cleanup");
});

test("listeners", "same process owns one native listener set and one AppState listener", async () => {
  const env = makeService();
  await env.service.initVoipPushAndRegisterOnce("restore", "A");
  await env.service.initVoipPushAndRegisterOnce("again", "A");
  assert.equal(env.native.listenerCount("deviceReady"), 1);
  assert.equal(env.native.listenerCount("deviceNotReady"), 1);
  assert.equal(env.appState.listenerCount(), 1);
  env.service.invalidateVoipRegistrationSession("cleanup");
});

test("privacy", "voice/auth JavaScript logs contain no access token and bounded identities", async () => {
  const secret = "VOICE_ACCESS_TOKEN_DO_NOT_LOG_0123456789";
  const env = makeService({ fetchVoiceToken: async () => ({ token: secret, identity: "A" }) });
  await env.service.initVoipPushAndRegisterOnce("privacy", "A");
  assert.equal(env.logger.text().includes(secret), false);
  assert.equal(env.logger.text().includes("VOICE_ACCESS_TOKEN"), false);
  env.service.invalidateVoipRegistrationSession("cleanup");
  await env.clock.advance(10000);
});

test("privacy", "diagnostics must redact or bound authenticated identity values", async () => {
  const identity = "barber-sensitive-identity-0123456789@example.invalid";
  const env = makeService({
    barber: { _id: identity },
    fetchVoiceToken: async () => ({ token: "voice-secret", identity }),
  });
  await env.service.initVoipPushAndRegisterOnce("privacy", identity);
  assert.equal(env.logger.text().includes(identity), false, "complete identity is logged");
  assert.equal(env.logger.text().includes(identity.slice(0, 12)), false, "identity fragment is logged");
  env.service.invalidateVoipRegistrationSession("cleanup");
  await env.clock.advance(10000);
});

test("privacy", "tested Expo JavaScript must not log a complete Expo token", async () => {
  const env = makePushHarness();
  await env.push.registerExpoPushTokenIfNeeded("A");
  assert.equal(env.logger.text().includes(env.token), false, "complete Expo token is logged");
  assert.equal(env.logger.text().includes("expo-complete-secret"), false, "Expo token fragment is logged");
});

test("identity persistence", "stale A is cleared when login omits barber", async () => {
  const pushEnv = makePushHarness();
  const auth = await exerciseAuth({
    storedBarber: { _id: "A" },
    loginResponse: { data: { token: "jwt-new" } },
    pushModule: pushEnv.push,
    onBarberChange: (barber) => pushEnv.setBarber(barber),
    runInitialEffects: false,
  });
  await auth.context().login("new@example.invalid", "not-a-real-password");
  await flush();
  assert.equal(auth.store.barber, null);
  assert.equal(pushEnv.posts.length, 0);
  assert.equal(pushEnv.secure.has("expoPushToken"), false);
  assert.equal(pushEnv.secure.has("expoPushProjectId"), false);
  assert.equal(pushEnv.secure.has("expoPushOwner"), false);
});

test("identity persistence", "stale A is replaced and persisted before B registration", async () => {
  const events = [];
  const pushEnv = makePushHarness();
  pushEnv.setPostImpl(async () => {
    events.push("pushPost");
    return { data: { ok: true } };
  });
  const auth = await exerciseAuth({
    storedBarber: { _id: "A" },
    loginResponse: { data: { token: "jwt-B", barber: { _id: "B" } } },
    pushModule: pushEnv.push,
    onBarberChange: (barber) => pushEnv.setBarber(barber),
    events,
    runInitialEffects: false,
  });
  await auth.context().login("b@example.invalid", "not-a-real-password");
  await Promise.all(auth.pushPromises);
  assert.deepEqual(auth.pushCalls, [["acquire", "B"]]);
  assert.ok(events.indexOf("saveBarber:B") < events.indexOf("pushPost"));
  assert.equal(pushEnv.posts.length, 1);
  assert.equal(pushEnv.secure.get("expoPushOwner"), "B");
});

test("identity persistence", "startup without JWT clears stale barber and never registers", async () => {
  const pushEnv = makePushHarness();
  const auth = await exerciseAuth({
    storedBarber: { _id: "A" },
    pushModule: pushEnv.push,
    onBarberChange: (barber) => pushEnv.setBarber(barber),
  });
  assert.equal(auth.store.barber, null);
  assert.deepEqual(auth.pushCalls, []);
  assert.equal(pushEnv.posts.length, 0);
});

test("identity persistence", "in-flight A cannot cache ownership after switching to B", async () => {
  const env = makePushHarness();
  const aPost = deferred();
  env.setPostImpl(() => aPost.promise);
  const staleA = env.push.registerExpoPushTokenIfNeeded("A");
  await flush();
  assert.equal(env.posts.length, 1);
  env.setBarber({ _id: "B" });
  aPost.resolve({ data: { ok: true } });
  assert.equal(await staleA, null);
  assert.equal(env.secure.has("expoPushToken"), false);
  assert.equal(env.secure.has("expoPushProjectId"), false);
  assert.equal(env.secure.has("expoPushOwner"), false);

  env.setPostImpl(async () => ({ data: { ok: true } }));
  await env.push.registerExpoPushTokenIfNeeded("B");
  assert.equal(env.posts.length, 2);
  assert.equal(env.secure.get("expoPushOwner"), "B");
});

async function main() {
  const results = [];
  for (const entry of tests) {
    try {
      await entry.fn();
      results.push({ ...entry, status: "PASS" });
      process.stdout.write(`PASS [${entry.kind}] ${entry.group} :: ${entry.name}\n`);
    } catch (error) {
      results.push({ ...entry, status: "FAIL", error });
      process.stdout.write(`FAIL [${entry.kind}] ${entry.group} :: ${entry.name}\n`);
      process.stdout.write(`  ${error.stack || error}\n`);
    }
  }
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.length - passed;
  const requiredFailed = results.filter((r) => r.status === "FAIL" && r.kind === "required").length;
  process.stdout.write(`\nTOTAL ${results.length} | PASS ${passed} | FAIL ${failed} | REQUIRED_FAIL ${requiredFailed}\n`);
  process.exitCode = requiredFailed ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
