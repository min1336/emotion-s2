import type { SupabaseClient } from "@supabase/supabase-js";
import { memberProfiles } from "./profileUtils";

type CreateCoupleSpaceRecordsInput = {
  code: string;
  displayName: string;
  inviteSecret: string;
};

export function findCoupleByCode(supabase: SupabaseClient, code: string) {
  return supabase
    .from("couples")
    .select("code")
    .eq("code", code)
    .maybeSingle();
}

export async function createCoupleSpaceRecords(
  supabase: SupabaseClient,
  { code, displayName, inviteSecret }: CreateCoupleSpaceRecordsInput,
) {
  const result = await supabase.from("couples").insert({
    code,
    display_name: displayName,
    invite_secret: inviteSecret,
  });

  if (result.error) {
    return result;
  }

  await supabase.from("couple_members").insert(
    memberProfiles.map((member) => ({
      couple_code: code,
      member_key: member.key,
      display_name: member.label,
    })),
  );

  return result;
}
