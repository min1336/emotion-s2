type PushPayloadInput = {
  message?: string;
  pokeId?: string;
  senderName?: string;
};

export function createPushPayload({ message, pokeId }: PushPayloadInput) {
  const body = message?.trim() || "상대가 콕 찔렀어요";

  return JSON.stringify({
    title: "정서 S2 민혁",
    body,
    tag: pokeId || "couple-poke",
    url: "/?tab=chat",
  });
}
