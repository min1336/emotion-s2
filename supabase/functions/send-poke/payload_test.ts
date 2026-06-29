import { assertEquals } from "jsr:@std/assert";
import { createPushPayload } from "./payload.ts";

Deno.test("creates notification body from the message only", () => {
  const payload = JSON.parse(
    createPushPayload({
      message: " 안녕 ",
      pokeId: "message-1",
      senderName: "정서",
    }),
  );

  assertEquals(payload, {
    title: "정서 S2 민혁",
    body: "안녕",
    tag: "message-1",
    url: "/?tab=chat",
  });
});

Deno.test("uses the poke fallback when the message is empty", () => {
  const payload = JSON.parse(createPushPayload({ message: "   " }));

  assertEquals(payload.body, "상대가 콕 찔렀어요");
});
