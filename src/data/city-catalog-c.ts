/**
 * WorldForge City Builder Catalog — Group C
 * 14 categories for city traffic, disasters, weather, day/night, and simulation.
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
      description: `City builder tool ${i} for ${prefix}: manage, build, or simulate ${prefix} systems and features.`,
      inputs: [
        num("scale", "Scale or size of operation", false, 100, 1, 10000),
        en("impact_level", "Impact level on city", ["minimal", "low", "medium", "high", "critical"], false, "medium"),
        bool("enabled", "Enable this feature", false, true),
      ],
      returns: `${prefix} tool ${i} result + city impact assessment`,
      tags: [prefix, "city_builder", "tool", "city"],
      sampleText: `${prefix} tool ${i} executed: scale=100, impact=medium`,
    });
  }
  return tools;
}

export const cityCategoriesC: CategoryDef[] = [
  {
    id: "city_traffic_management",
    name: "Traffic Management",
    short: "Traffic",
    description: "Manage traffic flow, signals, congestion, and road usage.",
    icon: "Car",
    color: "orange",
    accent: "from-orange-500 to-amber-500",
    tools: genTools("traffic", 27),
  },
  {
    id: "city_disasters",
    name: "Disasters & Emergencies",
    short: "Disasters",
    description: "Simulate and manage natural disasters: fires, floods, earthquakes, tornadoes.",
    icon: "Flame",
    color: "red",
    accent: "from-red-600 to-orange-600",
    tools: genTools("disasters", 27),
  },
  {
    id: "city_day_night",
    name: "Day/Night Cycle",
    short: "Day/Night",
    description: "Manage time-of-day simulation, citizen schedules, and day/night aesthetics.",
    icon: "Sun",
    color: "amber",
    accent: "from-amber-400 to-orange-500",
    tools: genTools("daynight", 27),
  },
  {
    id: "city_weather_seasons",
    name: "Weather & Seasons",
    short: "Weather",
    description: "Simulate weather patterns, seasonal changes, and climate effects on the city.",
    icon: "CloudRain",
    color: "blue",
    accent: "from-blue-500 to-indigo-500",
    tools: genTools("weather", 27),
  },
  {
    id: "city_statistics",
    name: "City Statistics & Analytics",
    short: "Statistics",
    description: "Track population, budget, happiness, and all city metrics with charts and reports.",
    icon: "BarChart3",
    color: "violet",
    accent: "from-violet-500 to-purple-500",
    tools: genTools("statistics", 27),
  },
  {
    id: "city_building_customization",
    name: "Building Customization",
    short: "Buildings",
    description: "Customize building styles, colors, upgrades, and visual appearance.",
    icon: "Building",
    color: "slate",
    accent: "from-slate-500 to-gray-600",
    tools: genTools("buildings", 27),
  },
  {
    id: "city_planning",
    name: "City Planning",
    short: "Planning",
    description: "Plan city layout, density, mixed-use development, and long-term growth strategy.",
    icon: "Ruler",
    color: "indigo",
    accent: "from-indigo-500 to-blue-600",
    tools: genTools("planning", 27),
  },
  {
    id: "city_map_generation",
    name: "Map & Terrain Generation",
    short: "Maps",
    description: "Generate city maps, biomes, resource distribution, and starting terrain.",
    icon: "Map",
    color: "green",
    accent: "from-green-500 to-teal-500",
    tools: genTools("maps", 27),
  },
  {
    id: "city_modding_api",
    name: "Modding & Custom Assets",
    short: "Modding",
    description: "Create custom assets, mods, and integrate community content.",
    icon: "Wrench",
    color: "purple",
    accent: "from-purple-500 to-fuchsia-500",
    tools: genTools("modding", 27),
  },
  {
    id: "city_events",
    name: "City Events & Festivals",
    short: "Events",
    description: "Organize festivals, parades, concerts, and city-wide events.",
    icon: "Sparkles",
    color: "pink",
    accent: "from-pink-500 to-rose-500",
    tools: genTools("events", 27),
  },
  {
    id: "city_smart_city",
    name: "Smart City & IoT",
    short: "Smart City",
    description: "Deploy IoT sensors, smart grids, data analytics, and city automation.",
    icon: "Gauge",
    color: "cyan",
    accent: "from-cyan-500 to-blue-500",
    tools: genTools("smartcity", 27),
  },
  {
    id: "city_green_city",
    name: "Green City & Sustainability",
    short: "Green City",
    description: "Build eco-friendly infrastructure, manage carbon footprint, and sustainability programs.",
    icon: "Leaf",
    color: "green",
    accent: "from-green-500 to-lime-500",
    tools: genTools("greencity", 27),
  },
  {
    id: "city_camera",
    name: "City Camera & Cinematics",
    short: "Camera",
    description: "Control city camera, free-roam, follow citizens, and capture cinematic shots.",
    icon: "Camera",
    color: "sky",
    accent: "from-sky-500 to-cyan-500",
    tools: genTools("camera", 27),
  },
  {
    id: "city_save_load",
    name: "City Save/Load & Sharing",
    short: "Save/Load",
    description: "Save city states, load scenarios, share cities, and manage save files.",
    icon: "Save",
    color: "emerald",
    accent: "from-emerald-500 to-green-500",
    tools: genTools("saveload", 27),
  },
];
