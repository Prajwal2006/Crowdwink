import type { CategoryId } from "./types";

export type Category = {
  id: CategoryId;
  label: string;
  emoji: string;
};

export const CATEGORIES: Category[] = [
  { id: "funny", label: "Funny", emoji: "🤪" },
  { id: "food", label: "Food", emoji: "🍕" },
  { id: "school", label: "School & College", emoji: "🎒" },
  { id: "lifestyle", label: "Lifestyle", emoji: "🛋️" },
  { id: "technology", label: "Technology", emoji: "📱" },
  { id: "superpowers", label: "Superpowers", emoji: "⚡" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "entertainment", label: "Entertainment", emoji: "🎬" },
  { id: "hypotheticals", label: "Hypotheticals", emoji: "🔮" },
  { id: "friends", label: "Friends & Relationships", emoji: "💛" },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as CategoryId[];

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
