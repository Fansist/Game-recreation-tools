/**
 * WorldForge City Builder Catalog — Group D
 * 14 categories for airports, harbors, tourism, code generation, and advanced features.
 */
import type { CategoryDef } from "./tool-catalog";

const str = (name: string, description: string, required = true, def?: string) => ({ name, type: "string" as const, required, description, default: def });
const num = (name: string, description: string, required = true, def?: number, min?: number, max?: number) => ({ name, type: "number" as const, required, description, default: def, min, max });
const bool = (name: string, description: string, required = false, def?: boolean) => ({ name, type: "boolean" as const, required, description, default: def });
const en = (name: string, description: string, values: string[], required = true, def?: string) => ({ name, type: "enum" as const, required, description, enum: values, default: def });
const arr = (name: string, description: string, required = true) => ({ name, type: "array" as const, required, description });

function genTools(prefix: string, count: number): any[] {
  const tools: any[] = [];
  for (let i = 1; i <= count; i++) {
    tools.push({
      suffix: `${prefix}_tool_${i}`,
      title: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Tool ${i}`,
      description: `City builder tool ${i} for ${prefix}: build, manage, or simulate ${prefix} systems for city building games.`,
      inputs: [
        num("budget_usd", "Budget in USD", false, 500000 * i, 1000, 100000000),
        en("quality_level", "Quality level", ["basic", "standard", "premium", "luxury"], false, i < 7 ? "standard" : "premium"),
        bool("auto_connect", "Auto-connect to city network", false, true),
      ],
      returns: `${prefix} tool ${i} result + city integration status`,
      tags: [prefix, "city_builder", "tool", "city"],
      sampleText: `${prefix} tool ${i} executed: budget=$${500000*i}, quality=standard`,
    });
  }
  return tools;
}

export const cityCategoriesD: CategoryDef[] = [
  {
    id: "city_airports",
    name: "Airports & Aviation",
    short: "Airports",
    description: "Build airports, runways, terminals, control towers, and manage air traffic.",
    icon: "Plane",
    color: "sky",
    accent: "from-sky-500 to-blue-500",
    tools: genTools("airports", 27),
  },
  {
    id: "city_harbors",
    name: "Harbors & Maritime",
    short: "Harbors",
    description: "Build harbors, docks, marinas, waterfronts, and manage maritime traffic.",
    icon: "Ship",
    color: "cyan",
    accent: "from-cyan-500 to-teal-500",
    tools: genTools("harbors", 27),
  },
  {
    id: "city_tourism",
    name: "Tourism & Landmarks",
    short: "Tourism",
    description: "Build tourist attractions, monuments, landmarks, and manage tourism economy.",
    icon: "Star",
    color: "amber",
    accent: "from-amber-500 to-orange-500",
    tools: genTools("tourism", 27),
  },
  {
    id: "city_ordinances",
    name: "City Ordinances & Regulations",
    short: "Ordinances",
    description: "Set parking, noise, building codes, and regulatory ordinances.",
    icon: "ScrollText",
    color: "stone",
    accent: "from-stone-500 to-gray-600",
    tools: genTools("ordinances", 27),
  },
  {
    id: "city_industry",
    name: "Industry & Manufacturing",
    short: "Industry",
    description: "Build factories, industrial zones, manufacturing plants, and manage industrial output.",
    icon: "Factory",
    color: "orange",
    accent: "from-orange-500 to-red-500",
    tools: genTools("industry", 27),
  },
  {
    id: "city_commercial",
    name: "Commercial & Business",
    short: "Commercial",
    description: "Build commercial zones, shopping centers, offices, and manage business districts.",
    icon: "ShoppingCart",
    color: "blue",
    accent: "from-blue-500 to-indigo-500",
    tools: genTools("commercial", 27),
  },
  {
    id: "city_residential",
    name: "Residential & Housing",
    short: "Residential",
    description: "Build residential zones, housing projects, neighborhoods, and manage housing policy.",
    icon: "Home",
    color: "emerald",
    accent: "from-emerald-500 to-green-500",
    tools: genTools("residential", 27),
  },
  {
    id: "city_achievements",
    name: "City Achievements & Challenges",
    short: "Achievements",
    description: "Track milestones, unlock achievements, complete challenges, and earn rewards.",
    icon: "Trophy",
    color: "yellow",
    accent: "from-yellow-500 to-amber-500",
    tools: genTools("achievements", 27),
  },
  {
    id: "city_tutorials",
    name: "Tutorials & Guidance",
    short: "Tutorials",
    description: "Build tutorial systems, guided city building, and in-game help.",
    icon: "BookOpen",
    color: "teal",
    accent: "from-teal-500 to-cyan-500",
    tools: genTools("tutorials", 27),
  },
  {
    id: "city_code_gen",
    name: "City Code Generation",
    short: "Code Gen",
    description: "Generate scripts, logic, and game code for city builder mechanics.",
    icon: "Code",
    color: "violet",
    accent: "from-violet-500 to-purple-500",
    tools: genTools("codegen", 27),
  },
  {
    id: "city_shaders",
    name: "City Shaders & Visual Effects",
    short: "Shaders",
    description: "Generate GLSL shaders for city visual effects, lighting, and rendering.",
    icon: "Sparkles",
    color: "fuchsia",
    accent: "from-fuchsia-500 to-pink-500",
    tools: genTools("shaders", 27),
  },
  {
    id: "city_materials",
    name: "City Materials & Textures",
    short: "Materials",
    description: "Create building materials, road textures, and city surface materials.",
    icon: "Palette",
    color: "rose",
    accent: "from-rose-500 to-pink-500",
    tools: genTools("materials", 27),
  },
  {
    id: "city_props",
    name: "City Props & Decorations",
    short: "Props",
    description: "Place street furniture, decorations, signage, and urban props.",
    icon: "Package",
    color: "amber",
    accent: "from-amber-500 to-yellow-500",
    tools: genTools("props", 27),
  },
  {
    id: "city_multiplayer",
    name: "City Multiplayer & Collaboration",
    short: "Multiplayer",
    description: "Build collaborative city building, region sharing, and multiplayer features.",
    icon: "Users",
    color: "indigo",
    accent: "from-indigo-500 to-blue-600",
    tools: genTools("multiplayer", 27),
  },
];
