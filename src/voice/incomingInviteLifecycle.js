export function callSidForInvite(invite) {
  return invite?.call_sid || invite?.callSid || invite?.CallSid || null;
}

export function createIncomingInviteLifecycle({ answerInvite, rejectInvite, onChange = () => {} }) {
  let sequence = 0;
  let current = null;
  let inFlight = null;

  const publish = () => onChange(current ? { invite: current.invite, status: current.status } : null);
  const matchesCurrent = (token) => current?.token === token;

  function receive(invite) {
    current = {
      invite,
      callSid: callSidForInvite(invite),
      status: "ringing",
      token: ++sequence,
    };
    inFlight = null;
    publish();
    return current.token;
  }

  function cancel(invite) {
    const cancelledSid = callSidForInvite(invite);
    if (!current || !cancelledSid || cancelledSid !== current.callSid) return false;
    current = null;
    inFlight = null;
    publish();
    return true;
  }

  function run(kind, operation) {
    if (!current) return Promise.resolve({ ignored: true, reason: "no_ringing_invite" });
    if (inFlight) {
      return inFlight.kind === kind
        ? inFlight.promise
        : Promise.resolve({ ignored: true, reason: "invite_action_in_progress" });
    }

    const target = current;
    target.status = kind === "answer" ? "answering" : "rejecting";
    publish();

    const promise = Promise.resolve().then(async () => {
      if (!matchesCurrent(target.token) || current.status !== target.status) {
        return { ignored: true, reason: "stale_invite" };
      }
      const result = await operation(target.invite);
      if (matchesCurrent(target.token)) {
        current = null;
        publish();
      }
      return result;
    }).catch((error) => {
      if (matchesCurrent(target.token)) {
        current.status = "ringing";
        publish();
      }
      throw error;
    }).finally(() => {
      if (inFlight?.token === target.token && inFlight?.kind === kind) inFlight = null;
    });

    inFlight = { kind, promise, token: target.token };
    return promise;
  }

  return Object.freeze({
    answer: () => run("answer", answerInvite),
    cancel,
    receive,
    reject: () => run("reject", rejectInvite),
    snapshot: () => current ? { invite: current.invite, status: current.status } : null,
  });
}
