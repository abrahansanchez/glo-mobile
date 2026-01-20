export function getSubscriptionError(error) {
  const code = error?.response?.data?.code;

  if (
    code === "SUBSCRIPTION_REQUIRED" ||
    code === "SUBSCRIPTION_PAST_DUE" ||
    code === "INCOMPLETE"
  ) {
    return code;
  }

  return null;
}
