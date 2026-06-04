import { assertEquals } from "jsr:@std/assert";
import { createPushTargetGroups } from "./targets.ts";

const baseSubscription = {
  auth: "auth",
  client_id: "client-target",
  device_key: "device-target",
  endpoint: "https://push.example/target",
  id: "subscription-target",
  member_key: "minhyeok",
  p256dh: "p256dh",
  user_agent: null,
};

Deno.test("targets every receiver endpoint instead of only one member group", () => {
  const groups = createPushTargetGroups(
    [
      {
        ...baseSubscription,
        device_key: "phone",
        endpoint: "https://push.example/phone",
        id: "subscription-phone",
      },
      {
        ...baseSubscription,
        device_key: "desktop",
        endpoint: "https://push.example/desktop",
        id: "subscription-desktop",
      },
    ],
    { senderId: "client-sender", senderMemberKey: "jungseo" },
  );

  assertEquals(groups.map((group) => group.key), [
    "https://push.example/phone",
    "https://push.example/desktop",
  ]);
});

Deno.test("does not target the sender member subscriptions", () => {
  const groups = createPushTargetGroups(
    [
      { ...baseSubscription, member_key: "jungseo" },
      {
        ...baseSubscription,
        endpoint: "https://push.example/receiver",
        id: "receiver",
      },
    ],
    { senderId: "client-sender", senderMemberKey: "jungseo" },
  );

  assertEquals(groups.map((group) => group.key), [
    "https://push.example/receiver",
  ]);
});

Deno.test("deduplicates duplicate endpoint rows", () => {
  const groups = createPushTargetGroups(
    [
      { ...baseSubscription, device_key: "old", id: "old" },
      { ...baseSubscription, device_key: "new", id: "new" },
    ],
    { senderId: "client-sender", senderMemberKey: "jungseo" },
  );

  assertEquals(groups.length, 1);
  assertEquals(groups[0].subscriptions.map((subscription) => subscription.id), [
    "old",
    "new",
  ]);
});
