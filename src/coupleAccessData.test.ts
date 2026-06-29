import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createCoupleSpaceRecords, findCoupleByCode } from "./coupleAccessData";

function createAccessSupabase(calls: string[], existingCouple: { code: string } | null = null, error: unknown = null) {
  return {
    from(table: string) {
      calls.push(`from:${table}`);
      return {
        select(columns: string) {
          calls.push(`${table}.select:${columns}`);
          return {
            eq(column: string, value: string) {
              calls.push(`${table}.eq:${column}:${value}`);
              return {
                maybeSingle() {
                  calls.push(`${table}.maybeSingle`);
                  return Promise.resolve({ data: existingCouple, error });
                },
              };
            },
          };
        },
        insert(payload: unknown) {
          calls.push(`${table}.insert:${JSON.stringify(payload)}`);
          return Promise.resolve({ error });
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe("coupleAccessData", () => {
  it("finds a couple by code", async () => {
    const calls: string[] = [];
    const supabase = createAccessSupabase(calls, { code: "S2-0526" });

    const result = await findCoupleByCode(supabase, "S2-0526");

    expect(result.data).toEqual({ code: "S2-0526" });
    expect(calls).toEqual([
      "from:couples",
      "couples.select:code",
      "couples.eq:code:S2-0526",
      "couples.maybeSingle",
    ]);
  });

  it("creates a couple and default members", async () => {
    const calls: string[] = [];
    const supabase = createAccessSupabase(calls);

    await createCoupleSpaceRecords(supabase, {
      code: "S2-0526",
      displayName: "정서 S2 민혁",
      inviteSecret: "secret",
    });

    expect(calls).toContain(
      'couples.insert:{"code":"S2-0526","display_name":"정서 S2 민혁","invite_secret":"secret"}',
    );
    expect(calls).toContain(
      'couple_members.insert:[{"couple_code":"S2-0526","member_key":"jungseo","display_name":"정서"},{"couple_code":"S2-0526","member_key":"minhyeok","display_name":"민혁"}]',
    );
  });
});
