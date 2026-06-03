import { z } from "zod";

/** Percentage-based position on the 1920×1080 canvas (resolution independent). */
export const positionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(0).max(100),
  height: z.number().min(0).max(100),
});
export type Position = z.infer<typeof positionSchema>;

/** Appwrite system fields present on every document. */
export const appwriteDocFields = {
  $id: z.string(),
  $createdAt: z.string(),
  $updatedAt: z.string(),
};
