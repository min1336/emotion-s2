import { describe, expectTypeOf, it } from "vitest";
import { memberKeys } from "./domainTypes";
import type {
  ChatMessage,
  CoupleEvent,
  CoupleEventRow,
  CoupleMessageRow,
  CouplePhoto,
  CouplePhotoRow,
  CoupleTodo,
  CoupleTodoRow,
  MemberKey,
  PhotoUrlSet,
} from "./domainTypes";

describe("domainTypes", () => {
  it("exposes the supported member keys", () => {
    expectTypeOf(memberKeys).toEqualTypeOf<readonly ["jungseo", "minhyeok"]>();
  });

  it("exposes shared couple domain contracts", () => {
    expectTypeOf<MemberKey>().toEqualTypeOf<"jungseo" | "minhyeok">();
    expectTypeOf<CoupleEvent>().toHaveProperty("createdAt").toEqualTypeOf<string>();
    expectTypeOf<CouplePhoto>().toHaveProperty("uploadedBy").toEqualTypeOf<MemberKey | undefined>();
    expectTypeOf<CoupleTodo>().toHaveProperty("completed").toEqualTypeOf<boolean>();
    expectTypeOf<PhotoUrlSet>().toEqualTypeOf<{
      displayUrl: string;
      thumbnailUrl: string;
      url: string;
    }>();
  });

  it("exposes database row and chat message contracts", () => {
    expectTypeOf<CoupleEventRow>().toHaveProperty("event_date").toEqualTypeOf<string>();
    expectTypeOf<CoupleTodoRow>().toHaveProperty("created_at").toEqualTypeOf<string>();
    expectTypeOf<CouplePhotoRow>().toHaveProperty("uploaded_by").toEqualTypeOf<MemberKey | null>();
    expectTypeOf<CoupleMessageRow>().toHaveProperty("sender_member_key").toEqualTypeOf<MemberKey>();
    expectTypeOf<ChatMessage>().toHaveProperty("delivery_status").toEqualTypeOf<"sending" | "failed" | undefined>();
    expectTypeOf<ChatMessage>().toHaveProperty("local_file").toEqualTypeOf<File | undefined>();
  });
});
