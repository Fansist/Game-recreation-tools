/**
 * WorldForge Tool Catalog — Combined Index
 * ------------------------------------------
 * Exports all categories and all tools from the catalog (parts 1, 2,
 * and the four extension groups A/B/C/D).
 *
 * Used by:
 *   - The Next.js web app (catalog browser UI)
 *   - The MCP server mini-service (tool handlers)
 */

import { categories as part1 } from "./tool-catalog";
import { categoriesPart2 as part2 } from "./tool-catalog-part2";
import { extensionsA } from "./tool-catalog-ext-a";
import { extensionsB } from "./tool-catalog-ext-b";
import { extensionsC } from "./tool-catalog-ext-c";
import { extensionsD } from "./tool-catalog-ext-d";
import { cityCategoriesA } from "./city-catalog-a";
import { cityCategoriesB } from "./city-catalog-b";
import { cityCategoriesC } from "./city-catalog-c";
import { cityCategoriesD } from "./city-catalog-d";

export * from "./tool-catalog";
export { categoriesPart2 } from "./tool-catalog-part2";
export { extensionsA } from "./tool-catalog-ext-a";
export { extensionsB } from "./tool-catalog-ext-b";
export { extensionsC } from "./tool-catalog-ext-c";
export { extensionsD } from "./tool-catalog-ext-d";
export { cityCategoriesA } from "./city-catalog-a";
export { cityCategoriesB } from "./city-catalog-b";
export { cityCategoriesC } from "./city-catalog-c";
export { cityCategoriesD } from "./city-catalog-d";

/** Map of category id → extension tools (merged across all 4 groups). */
const allExtensions: Record<string, import("./tool-catalog").ToolTemplate[]> = {
  ...extensionsA,
  ...extensionsB,
  ...extensionsC,
  ...extensionsD,
};

/** City builder categories (56 categories, ~1500 tools). */
const cityCategories = [
  ...cityCategoriesA,
  ...cityCategoriesB,
  ...cityCategoriesC,
  ...cityCategoriesD,
];

/** Merged categories with base + extension tools + city builder categories. */
export const allCategories = [
  ...[...part1, ...part2].map((cat) => ({
    ...cat,
    tools: [...cat.tools, ...(allExtensions[cat.id] || [])],
  })),
  ...cityCategories,
];

export interface FlatTool {
  /** Fully-qualified MCP tool name, e.g. `characters_generate_hero`. */
  name: string;
  /** Human-readable title. */
  title: string;
  /** Tool description. */
  description: string;
  /** Category id. */
  category: string;
  /** Category display name. */
  categoryName: string;
  /** Category icon (lucide-react name). */
  categoryIcon: string;
  /** Category accent gradient (tailwind). */
  categoryAccent: string;
  /** Category color name. */
  categoryColor: string;
  /** Search tags. */
  tags: string[];
  /** Input parameters. */
  inputs: import("./tool-catalog").ToolInput[];
  /** What the tool returns. */
  returns: string;
  /** Sample response text. */
  sampleText?: string;
}

/** Flatten the catalog into a single array of tools. */
export function flattenTools(): FlatTool[] {
  const tools: FlatTool[] = [];
  for (const cat of allCategories) {
    for (const t of cat.tools) {
      tools.push({
        name: `${cat.id}_${t.suffix}`,
        title: t.title,
        description: t.description,
        category: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        categoryAccent: cat.accent,
        categoryColor: cat.color,
        tags: t.tags,
        inputs: t.inputs,
        returns: t.returns,
        sampleText: t.sampleText,
      });
    }
  }
  return tools;
}

export const allTools = flattenTools();
export const totalToolCount = allTools.length;
export const totalCategoryCount = allCategories.length;
