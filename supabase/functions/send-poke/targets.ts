export type PushSubscriptionTarget = {
  auth: string;
  client_id: string;
  device_key: string | null;
  endpoint: string;
  id: string;
  member_key: string | null;
  p256dh: string;
  user_agent: string | null;
};

export type PushSender = {
  senderId: string;
  senderMemberKey?: string;
};

export type PushTargetGroup = {
  key: string;
  subscriptions: PushSubscriptionTarget[];
};

export function shouldTargetPushSubscription(
  subscription: PushSubscriptionTarget,
  { senderId, senderMemberKey }: PushSender,
) {
  const memberKey = subscription.member_key?.trim();
  if (senderMemberKey && memberKey) {
    return memberKey !== senderMemberKey;
  }

  return subscription.client_id !== senderId;
}

export function getPushTargetKey(subscription: PushSubscriptionTarget) {
  return subscription.endpoint;
}

export function createPushTargetGroups(
  subscriptions: PushSubscriptionTarget[],
  sender: PushSender,
) {
  const targetGroups = new Map<string, PushTargetGroup>();

  subscriptions
    .filter((subscription) =>
      shouldTargetPushSubscription(subscription, sender)
    )
    .forEach((subscription) => {
      const key = getPushTargetKey(subscription);
      const existingGroup = targetGroups.get(key);
      if (existingGroup) {
        existingGroup.subscriptions.push(subscription);
        return;
      }

      targetGroups.set(key, { key, subscriptions: [subscription] });
    });

  return Array.from(targetGroups.values());
}
