/**
 * WorldForge City Builder Catalog — Group B
 * 14 categories for city services, parks, policies, districts, and city management.
 * This is a partial file — see city-catalog-a.ts for the full format.
 */
import type { CategoryDef } from "./tool-catalog";

const str = (name: string, description: string, required = true, def?: string) => ({ name, type: "string" as const, required, description, default: def });
const num = (name: string, description: string, required = true, def?: number, min?: number, max?: number) => ({ name, type: "number" as const, required, description, default: def, min, max });
const bool = (name: string, description: string, required = false, def?: boolean) => ({ name, type: "boolean" as const, required, description, default: def });
const en = (name: string, description: string, values: string[], required = true, def?: string) => ({ name, type: "enum" as const, required, description, enum: values, default: def });
const arr = (name: string, description: string, required = true) => ({ name, type: "array" as const, required, description });
const obj = (name: string, description: string, required = true) => ({ name, type: "object" as const, required, description });

// Helper: generate N tools for a category with a prefix
function genTools(prefix: string, count: number, titleFn: (i: number) => string, descFn: (i: number) => string): any[] {
  const tools: any[] = [];
  for (let i = 1; i <= count; i++) {
    tools.push({
      suffix: `${prefix}_tool_${i}`,
      title: titleFn(i),
      description: descFn(i),
      inputs: [
        num("budget_usd", "Budget in USD", false, 100000 * i, 1000, 50000000),
        en("priority", "Priority level", ["low", "medium", "high", "critical"], false, i < 7 ? "medium" : "high"),
        bool("auto_allocate", "Auto-allocate resources", false, true),
      ],
      returns: `${prefix} tool ${i} result + impact report`,
      tags: [prefix, "city_builder", "tool", "city"],
      sampleText: `${prefix} tool ${i} executed successfully`,
    });
  }
  return tools;
}

export const cityCategoriesB: CategoryDef[] = [
  {
    id: "city_public_services",
    name: "Public Services",
    short: "Services",
    description: "Build and manage police, fire, healthcare, education, and other public services.",
    icon: "Shield",
    color: "red",
    accent: "from-red-500 to-rose-500",
    tools: genTools("services", 27,
      (i) => `Public Service Tool ${i}`,
      (i) => `Manage public service ${i}: allocate resources, set coverage, manage budgets for city services.`),
  },
  {
    id: "city_parks",
    name: "Parks & Recreation",
    short: "Parks",
    description: "Build parks, plazas, sports fields, playgrounds, and recreational facilities.",
    icon: "Trees",
    color: "green",
    accent: "from-green-500 to-emerald-500",
    tools: genTools("parks", 27,
      (i) => `Parks & Recreation Tool ${i}`,
      (i) => `Build or manage park facility ${i}: design green spaces, sports fields, playgrounds, walking trails.`),
  },
  {
    id: "city_policies",
    name: "City Policies",
    short: "Policies",
    description: "Set taxation, ordinances, regulations, and city-wide policies.",
    icon: "ScrollText",
    color: "amber",
    accent: "from-amber-500 to-yellow-500",
    tools: genTools("policies", 27,
      (i) => `City Policy Tool ${i}`,
      (i) => `Enact or modify policy ${i}: taxes, regulations, ordinances, zoning rules, service policies.`),
  },
  {
    id: "city_districts",
    name: "Districts & Specialization",
    short: "Districts",
    description: "Create districts, set specializations, and apply district-specific policies.",
    icon: "MapPin",
    color: "violet",
    accent: "from-violet-500 to-purple-500",
    tools: genTools("districts", 27,
      (i) => `District Tool ${i}`,
      (i) => `Create or manage district ${i}: specialize areas, set policies, manage growth and character.`),
  },
  {
    id: "city_economy",
    name: "Economy & Finance",
    short: "Economy",
    description: "Manage city budget, loans, taxes, and financial planning.",
    icon: "DollarSign",
    color: "yellow",
    accent: "from-yellow-500 to-amber-500",
    tools: genTools("economy", 27,
      (i) => `Economy Tool ${i}`,
      (i) => `Manage city finances ${i}: budget allocation, loans, tax rates, financial forecasting.`),
  },
  {
    id: "city_citizens",
    name: "Citizen Simulation",
    short: "Citizens",
    description: "Simulate population, happiness, needs, demographics, and citizen behavior.",
    icon: "Users",
    color: "blue",
    accent: "from-blue-500 to-cyan-500",
    tools: genTools("citizens", 27,
      (i) => `Citizen Simulation Tool ${i}`,
      (i) => `Simulate citizen behavior ${i}: population dynamics, happiness, needs, demographics, migration.`),
  },
  {
    id: "city_education",
    name: "Education & Schools",
    short: "Education",
    description: "Build schools, universities, libraries, and manage education policies.",
    icon: "GraduationCap",
    color: "indigo",
    accent: "from-indigo-500 to-blue-500",
    tools: genTools("education", 27,
      (i) => `Education Tool ${i}`,
      (i) => `Build or manage education facility ${i}: schools, universities, libraries, education policies.`),
  },
  {
    id: "city_healthcare",
    name: "Healthcare",
    short: "Healthcare",
    description: "Build hospitals, clinics, medical centers, and manage public health.",
    icon: "HeartPulse",
    color: "rose",
    accent: "from-rose-500 to-pink-500",
    tools: genTools("healthcare", 27,
      (i) => `Healthcare Tool ${i}`,
      (i) => `Build or manage healthcare facility ${i}: hospitals, clinics, ambulances, health policies.`),
  },
  {
    id: "city_emergency_services",
    name: "Emergency Services",
    short: "Emergency",
    description: "Manage police, fire, and ambulance dispatch and emergency response.",
    icon: "Siren",
    color: "red",
    accent: "from-red-600 to-orange-600",
    tools: genTools("emergency", 27,
      (i) => `Emergency Services Tool ${i}`,
      (i) => `Manage emergency services ${i}: fire stations, police stations, ambulance dispatch, disaster response.`),
  },
  {
    id: "city_budget",
    name: "Budget & Finance",
    short: "Budget",
    description: "Manage the city budget, take loans, set tax rates, and track financial health.",
    icon: "Banknote",
    color: "emerald",
    accent: "from-emerald-500 to-teal-500",
    tools: genTools("budget", 27,
      (i) => `Budget & Finance Tool ${i}`,
      (i) => `Manage city budget ${i}: allocate funds, take loans, set tax rates, financial planning.`),
  },
  {
    id: "city_growth",
    name: "City Growth & Milestones",
    short: "Growth",
    description: "Track city growth, unlock milestones, and manage development progression.",
    icon: "TrendingUp",
    color: "teal",
    accent: "from-teal-500 to-cyan-500",
    tools: genTools("growth", 27,
      (i) => `City Growth Tool ${i}`,
      (i) => `Track and manage city growth ${i}: milestones, unlocks, development progression, population targets.`),
  },
  {
    id: "city_landscaping",
    name: "Landscaping & Terrain",
    short: "Landscaping",
    description: "Modify terrain, add trees, water features, and landscape the city.",
    icon: "Mountain",
    color: "lime",
    accent: "from-lime-500 to-green-500",
    tools: genTools("landscaping", 27,
      (i) => `Landscaping Tool ${i}`,
      (i) => `Modify terrain and landscape ${i}: raise/lower ground, add trees, water, rocks, natural features.`),
  },
  {
    id: "city_pollution",
    name: "Environment & Pollution",
    short: "Pollution",
    description: "Monitor and manage air, water, ground, and noise pollution.",
    icon: "Cloud",
    color: "gray",
    accent: "from-gray-500 to-slate-600",
    tools: genTools("pollution", 27,
      (i) => `Pollution Management Tool ${i}`,
      (i) => `Monitor and reduce pollution ${i}: air quality, water pollution, ground contamination, noise control.`),
  },
  {
    id: "city_sound",
    name: "City Sound & Ambience",
    short: "Sound",
    description: "Manage ambient sounds, traffic noise, and city audio landscape.",
    icon: "Volume2",
    color: "cyan",
    accent: "from-cyan-500 to-teal-500",
    tools: genTools("sound", 27,
      (i) => `City Sound Tool ${i}`,
      (i) => `Manage city audio ${i}: ambient sounds, traffic noise, pedestrian chatter, event audio, noise zones.`),
  },
];
