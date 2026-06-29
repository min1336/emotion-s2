export type PushResult = {
  attempted?: number;
  failed?: number;
  removed?: number;
  sent?: number;
};

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = globalThis.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function uint8ArrayToUrlBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  const base64 = globalThis.btoa(binary);

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function bufferSourceToUint8Array(source: BufferSource) {
  if (source instanceof ArrayBuffer) {
    return new Uint8Array(source);
  }

  return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
}

export function getPushDeliveryStatusMessage(baseMessage: string, result?: PushResult | null) {
  const sent = result?.sent ?? 0;
  const attempted = result?.attempted ?? 0;
  const failed = result?.failed ?? 0;

  if (sent > 0) {
    return `${baseMessage} 핸드폰 알림도 보냈어요.`;
  }

  if (attempted === 0) {
    return `${baseMessage} 상대방이 알림을 켜면 핸드폰에도 떠요.`;
  }

  if (failed > 0 || attempted > 0) {
    return `${baseMessage} 핸드폰 알림 전송에 실패했어요. 상대방이 알림을 다시 켜야 해요.`;
  }

  return baseMessage;
}
