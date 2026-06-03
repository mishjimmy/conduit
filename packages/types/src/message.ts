import { z } from "zod";
import { appwriteDocFields } from "./common";

export const messageStyleSchema = z.enum(["info", "alert", "emergency"]);
export type MessageStyle = z.infer<typeof messageStyleSchema>;

export const messageSchema = z.object({
  ...appwriteDocFields,
  screen_id: z.string().nullable().default(null),
  group_id: z.string().nullable().default(null),
  body: z.string(),
  style: messageStyleSchema.default("info"),
  show_at: z.string().nullable().default(null),
  hide_at: z.string().nullable().default(null),
  dismissed_at: z.string().nullable().default(null),
  is_broadcast: z.boolean().default(false),
});
export type Message = z.infer<typeof messageSchema>;
