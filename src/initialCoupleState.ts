export type JoinMode = "join" | "create";

type InitialCoupleStateInput = {
  initialCodeInput: string;
  initialSecretInput: string;
  storedCoupleCode: string;
  storedCoupleSecret: string;
};

export function getInitialCoupleState({
  initialCodeInput,
  initialSecretInput,
  storedCoupleCode,
  storedCoupleSecret,
}: InitialCoupleStateInput) {
  const shouldResumeStoredCouple =
    storedCoupleCode &&
    storedCoupleSecret &&
    (!initialCodeInput || initialCodeInput === storedCoupleCode) &&
    (!initialSecretInput || initialSecretInput === storedCoupleSecret);

  return {
    codeInput: initialCodeInput || storedCoupleCode,
    coupleCode: shouldResumeStoredCouple ? storedCoupleCode : "",
    coupleSecret: shouldResumeStoredCouple ? storedCoupleSecret : "",
    joinMode: initialCodeInput || storedCoupleCode ? "join" : "create",
    secretInput: initialSecretInput || storedCoupleSecret,
  } satisfies {
    codeInput: string;
    coupleCode: string;
    coupleSecret: string;
    joinMode: JoinMode;
    secretInput: string;
  };
}
