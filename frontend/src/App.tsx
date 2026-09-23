/**
 * The shell configuration and the layout.
 *
 * The header, footer, theme and language toggles all come from the shared shell rather than being
 * written here, so they are identical to every other product in the line by construction and a fix
 * lands once.
 */

import {
  AppShell,
  CitationsProvider,
  useShellLang,
  type ShellConfig,
} from "@fasl-work/caos-app-shell";
import { ScanText } from "lucide-react";
import { useEffect } from "react";
import { Outlet } from "react-router";

import { ArchitectureTabs } from "./components/ArchitectureTabs";
import { CITATIONS } from "./data/citations";
import { useData } from "./lib/data";
import i18n from "./lib/i18n";

const VERSION = "0.01.000";

export function Layout() {
  const load = useData((state) => state.load);
  const lang = useShellLang() ?? "en";

  useEffect(() => {
    void load();
  }, [load]);

  // The shell owns the language; i18next had its own, fixed at "en" and never told. Half the
  // workbench chrome (the case label, the tier word, the control-case chip, the section headings)
  // stayed English on the Spanish page, next to prose that had switched correctly. Two sources of
  // truth for one setting is the defect; this makes the shell's the only one.
  useEffect(() => {
    if (i18n.language !== lang) void i18n.changeLanguage(lang);
  }, [lang]);

  const config: ShellConfig = {
    product: { name: "Enunciado", mark: <ScanText size={20} /> },
    routes: [
      { path: "/", en: "Workbench", es: "Banco de trabajo" },
      { path: "/introduction", en: "Introduction", es: "Introduccion" },
      { path: "/methodology", en: "Methodology", es: "Metodologia" },
      { path: "/implementation", en: "Implementation", es: "Implementacion" },
      { path: "/experiments", en: "Experiments", es: "Experimentos" },
      { path: "/benchmark", en: "Benchmark", es: "Comparativa" },
    ],
    links: { github: "https://github.com/fsantibanezleal/CAOS_Enunciado" },
    version: VERSION,
    architecture: {
      title_en: "How Enunciado works",
      title_es: "Como funciona Enunciado",
      tabs: ArchitectureTabs,
    },
    footer: {
      license: { en: "MIT", es: "MIT" },
      // Provenance is the honest part of the footer: where the numbers come from and what they
      // are, not a restatement of the header links.
      provenance: {
        en: "Cases authored for this product; solved offline with HiGHS via Pyomo. Engines: HiGHS (MIT), Pyomo (BSD-3), MiniZinc (MPL-2.0).",
        es: "Casos escritos para este producto; resueltos sin conexion con HiGHS via Pyomo. Motores: HiGHS (MIT), Pyomo (BSD-3), MiniZinc (MPL-2.0).",
      },
      disclaimer: {
        en: "Every number shown is replayed from a committed artifact produced by a local bake. Nothing is computed at page load except what you change yourself.",
        es: "Cada numero mostrado se reproduce desde un artefacto versionado producido por un calculo local. Nada se calcula al cargar la pagina salvo lo que usted modifique.",
      },
    },
    // The workbench IS the viewport: it sizes to the window and scrolls inside its own container
    // rather than growing the document.
    fixedRoutes: ["/"],
  };

  // The citation registry is provided ONCE, wrapping the shell, so `<Cite>` and `<Refs>` resolve on
  // every route (ADR-0017 section 4.3). Mounting it per page meant a section that cited a work the
  // page had not imported rendered a dangling id with nothing to say so.
  return (
    <CitationsProvider items={CITATIONS}>
      <AppShell config={config}>
        <Outlet />
      </AppShell>
    </CitationsProvider>
  );
}
