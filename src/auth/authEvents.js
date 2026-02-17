let onUnauthorized = null;

export function setOnUnauthorized(handler) {
  onUnauthorized = handler;
}

export function emitUnauthorized() {
  if (typeof onUnauthorized === "function") onUnauthorized();
}

let onSubscriptionRequired = null;

export function setOnSubscriptionRequired(handler) {
  onSubscriptionRequired = handler;
}

export function emitSubscriptionRequired(code) {
  if (typeof onSubscriptionRequired === "function") onSubscriptionRequired(code);
}
