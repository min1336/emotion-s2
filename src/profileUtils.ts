import { memberKeys, type MemberKey } from "./domainTypes";

export const memberProfiles: Array<{ key: MemberKey; label: string; caption: string }> = [
  { key: memberKeys[0], label: "정서", caption: "jungseo" },
  { key: memberKeys[1], label: "민혁", caption: "minhyeok" },
];

export function getMemberDisplayName(memberKey?: string | null) {
  return memberProfiles.find((member) => member.key === memberKey)?.label || "상대";
}
