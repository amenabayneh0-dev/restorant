export const TAGS = [
  { id: "vegetarian", label: "Vegetarian", tone: "green" },
  { id: "vegan", label: "Vegan", tone: "green" },
  { id: "fasting", label: "Fasting", tone: "olive" },
  { id: "spicy", label: "Spicy", tone: "red" },
  { id: "gluten-free", label: "Gluten-free", tone: "blue" },
  { id: "popular", label: "Popular", tone: "gold" },
  { id: "new", label: "New", tone: "gold" },
] as const;
export type TagId = (typeof TAGS)[number]["id"];
export const TAG_IDS: string[] = TAGS.map((t) => t.id);
export const tagInfo = (id: string) => TAGS.find((t) => t.id === id);
/** Tags a customer can filter by (badges like "Popular" are decoration only). */
export const FILTER_TAGS = TAGS.filter((t) => t.id !== "popular" && t.id !== "new");
