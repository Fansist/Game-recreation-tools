"use client";

import { useRef, useState } from "react";
import { Hero } from "@/components/worldforge/Hero";
import { StatsDashboard } from "@/components/worldforge/StatsDashboard";
import { FeaturedTool } from "@/components/worldforge/FeaturedTool";
import { CategoriesGrid } from "@/components/worldforge/CategoriesGrid";
import { ToolBrowser } from "@/components/worldforge/ToolBrowser";
import { InstallationGuide } from "@/components/worldforge/InstallationGuide";
import { SiteFooter } from "@/components/worldforge/SiteFooter";
import { TopNav } from "@/components/worldforge/TopNav";
import { KeyboardShortcuts } from "@/components/worldforge/KeyboardShortcuts";
import type { FlatTool } from "@/data/catalog-index";
import { allCategories, allTools, totalToolCount, totalCategoryCount } from "@/data/catalog-index";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const browserRef = useRef<HTMLDivElement>(null);
  const installRef = useRef<HTMLDivElement>(null);

  const scrollToBrowser = () => {
    document.getElementById("browser")?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollToInstall = () => {
    document.getElementById("install")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSelectCategory = (id: string) => {
    setActiveCategory(id);
    setTimeout(() => scrollToBrowser(), 100);
  };

  // FeaturedTool uses the URL hash (#tool=name) to tell ToolBrowser to open
  // a tool. This fallback is rarely needed but keeps the contract explicit.
  const handleFeaturedSelect = (_tool: FlatTool) => {
    // ToolBrowser's hashchange listener handles the actual open.
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav
        toolCount={totalToolCount}
        onBrowse={scrollToBrowser}
        onInstall={scrollToInstall}
      />
      <main className="flex-1">
        <Hero
          toolCount={totalToolCount}
          categoryCount={totalCategoryCount}
          onBrowse={scrollToBrowser}
          onInstall={scrollToInstall}
        />
        <StatsDashboard />
        <FeaturedTool allTools={allTools} onSelect={handleFeaturedSelect} />
        <div id="categories">
          <CategoriesGrid
            categories={allCategories}
            onSelectCategory={handleSelectCategory}
          />
        </div>
        <div ref={browserRef}>
          <ToolBrowser
            categories={allCategories}
            tools={allTools}
            activeCategory={activeCategory}
            onClearCategory={() => setActiveCategory(null)}
            onSelectCategory={handleSelectCategory}
          />
        </div>
        <div ref={installRef}>
          <InstallationGuide
            toolCount={totalToolCount}
            categoryCount={totalCategoryCount}
          />
        </div>
      </main>
      <SiteFooter
        toolCount={totalToolCount}
        categoryCount={totalCategoryCount}
      />
      <KeyboardShortcuts />
    </div>
  );
}
