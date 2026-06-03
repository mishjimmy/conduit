import { uniqueNamesGenerator, adjectives, animals } from "unique-names-generator";

/** Human-readable two-word screen id, e.g. `brave-otter`. Used as the Appwrite $id. */
export function generateScreenSlug(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: "-",
    length: 2,
    style: "lowerCase",
  });
}
