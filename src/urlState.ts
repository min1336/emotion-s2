import { normalizeCoupleCode, normalizeCoupleSecret } from "./coupleAccess";

type BuildInviteLinkInput = {
  coupleCode: string;
  coupleSecret: string;
  origin: string;
  pathname: string;
};

export function getInitialCodeInput(search: string) {
  const params = new URLSearchParams(search);
  return normalizeCoupleCode(params.get("code") || "");
}

export function getInitialSecretInput(search: string) {
  const params = new URLSearchParams(search);
  return normalizeCoupleSecret(params.get("invite") || params.get("secret") || "");
}

export function getInitialTab(search: string) {
  const params = new URLSearchParams(search);
  return params.get("tab") === "chat" ? "chat" : "home";
}

export function buildInviteLink({ coupleCode, coupleSecret, origin, pathname }: BuildInviteLinkInput) {
  if (!coupleCode) {
    return "";
  }

  return `${origin}${pathname}?code=${encodeURIComponent(coupleCode)}&invite=${encodeURIComponent(coupleSecret)}`;
}
