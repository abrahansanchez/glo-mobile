const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const babel = require("../node_modules/@babel/core");

const ROOT = path.resolve(__dirname, "..");
const file = `${ROOT}/src/voice/incomingInviteLifecycle.js`;
const code = babel.transformSync(fs.readFileSync(file, "utf8"), {
  filename: file,
  plugins: [require("../node_modules/@babel/plugin-transform-modules-commonjs")],
}).code;
const sandbox = { exports: {}, module: { exports: {} }, Object, Promise };
sandbox.module.exports = sandbox.exports;
vm.runInNewContext(code, sandbox, { filename: file });
const lifecycleModule = sandbox.module.exports;

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

let passed = 0;
async function test(name, fn) {
  await fn();
  passed += 1;
  console.log(`PASS ${passed}: ${name}`);
}

(async () => {
  await test("ringing decline calls direct invite rejection without takeover", async () => {
    const calls = [];
    const lifecycle = lifecycleModule.createIncomingInviteLifecycle({
      answerInvite: async () => calls.push("answer"),
      rejectInvite: async (invite) => calls.push(`reject:${lifecycleModule.callSidForInvite(invite)}`),
    });
    lifecycle.receive({ call_sid: "CA-1" });
    await lifecycle.reject();
    assert.deepStrictEqual(calls, ["reject:CA-1"]);
    assert.strictEqual(lifecycle.snapshot(), null);
  });

  await test("repeated decline taps share one rejection", async () => {
    const held = deferred();
    let rejects = 0;
    const lifecycle = lifecycleModule.createIncomingInviteLifecycle({
      answerInvite: async () => {},
      rejectInvite: async () => { rejects += 1; return held.promise; },
    });
    lifecycle.receive({ callSid: "CA-2" });
    const first = lifecycle.reject();
    const second = lifecycle.reject();
    await Promise.resolve();
    assert.strictEqual(rejects, 1);
    held.resolve({ rejected: true });
    await Promise.all([first, second]);
    assert.strictEqual(rejects, 1);
  });

  await test("caller cancellation before rejection prevents native action", async () => {
    let rejects = 0;
    const lifecycle = lifecycleModule.createIncomingInviteLifecycle({
      answerInvite: async () => {},
      rejectInvite: async () => { rejects += 1; },
    });
    lifecycle.receive({ CallSid: "CA-3" });
    const pending = lifecycle.reject();
    assert.strictEqual(lifecycle.cancel({ call_sid: "CA-3" }), true);
    const result = await pending;
    assert.strictEqual(result.reason, "stale_invite");
    assert.strictEqual(rejects, 0);
  });

  await test("stale cancellation cannot clear a newer invite", () => {
    const lifecycle = lifecycleModule.createIncomingInviteLifecycle({
      answerInvite: async () => {},
      rejectInvite: async () => {},
    });
    lifecycle.receive({ call_sid: "CA-old" });
    lifecycle.receive({ call_sid: "CA-new" });
    assert.strictEqual(lifecycle.cancel({ call_sid: "CA-old" }), false);
    assert.strictEqual(lifecycleModule.callSidForInvite(lifecycle.snapshot().invite), "CA-new");
  });

  await test("late old rejection completion cannot clear newer invite", async () => {
    const held = deferred();
    const lifecycle = lifecycleModule.createIncomingInviteLifecycle({
      answerInvite: async () => {},
      rejectInvite: async () => held.promise,
    });
    lifecycle.receive({ call_sid: "CA-old" });
    const oldReject = lifecycle.reject();
    await Promise.resolve();
    lifecycle.receive({ call_sid: "CA-new" });
    held.resolve({ rejected: true });
    await oldReject;
    assert.strictEqual(lifecycleModule.callSidForInvite(lifecycle.snapshot().invite), "CA-new");
  });

  await test("answer wins answer/reject race", async () => {
    const held = deferred();
    let answers = 0;
    let rejects = 0;
    const lifecycle = lifecycleModule.createIncomingInviteLifecycle({
      answerInvite: async () => { answers += 1; return held.promise; },
      rejectInvite: async () => { rejects += 1; },
    });
    lifecycle.receive({ call_sid: "CA-4" });
    const answer = lifecycle.answer();
    const reject = await lifecycle.reject();
    assert.strictEqual(reject.reason, "invite_action_in_progress");
    held.resolve({ answered: true });
    await answer;
    assert.strictEqual(answers, 1);
    assert.strictEqual(rejects, 0);
  });

  await test("reject wins reject/answer race", async () => {
    const held = deferred();
    let answers = 0;
    let rejects = 0;
    const lifecycle = lifecycleModule.createIncomingInviteLifecycle({
      answerInvite: async () => { answers += 1; },
      rejectInvite: async () => { rejects += 1; return held.promise; },
    });
    lifecycle.receive({ call_sid: "CA-5" });
    const reject = lifecycle.reject();
    const answer = await lifecycle.answer();
    assert.strictEqual(answer.reason, "invite_action_in_progress");
    held.resolve({ rejected: true });
    await reject;
    assert.strictEqual(rejects, 1);
    assert.strictEqual(answers, 0);
  });

  console.log(`TOTAL ${passed} | PASS ${passed} | FAIL 0`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
