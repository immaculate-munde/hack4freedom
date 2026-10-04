import { describe, expect, it } from "vitest";
import { chatIdFromUpdate, inboundFromUpdate } from "./parse-update";

describe("parse-update", () => {
  it("reads /start commands and strips bot username", () => {
    const inbound = inboundFromUpdate({
      message: { chat: { id: 42 }, text: "/start@PesaSenseBot" },
    });
    expect(chatIdFromUpdate({ message: { chat: { id: 42 } } })).toBe(42);
    expect(inbound).toEqual({ kind: "command", command: "/start", args: "" });
  });

  it("reads callback and document updates", () => {
    expect(
      inboundFromUpdate({
        callback_query: { data: "demo:amina", message: { chat: { id: 9 } } },
      }),
    ).toEqual({ kind: "callback", data: "demo:amina" });

    expect(
      inboundFromUpdate({
        message: {
          chat: { id: 9 },
          document: {
            file_id: "file-1",
            file_name: "amina-statement.pdf",
            mime_type: "application/pdf",
          },
        },
      }),
    ).toEqual({
      kind: "document",
      fileId: "file-1",
      fileName: "amina-statement.pdf",
      mimeType: "application/pdf",
    });
  });
});
