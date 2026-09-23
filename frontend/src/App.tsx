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

const VERSION = "0.03.000";

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
        en: "Cases authored for this product; solved with HiGHS, offline via Pyomo and in the page as WebAssembly. Engines: HiGHS (MIT), Pyomo (BSD-3).",
        es: "Casos escritos para este producto; resueltos con HiGHS, sin conexion via Pyomo y en la pagina como WebAssembly. Motores: HiGHS (MIT), Pyomo (BSD-3).",
      },
      // MiniZinc was listed here as an engine. It appears only in the portability probe under
      // tools/, and nothing the product ships runs it. Both lines are kept to one row at 1440px:
      // the workbench sizes to what the chrome leaves, and a second footer row cost the
      // instrument its half of the viewport (ADR-0071).
      disclaimer: {
        en: "Published numbers replay a committed local bake. What the workbench solves in your browser explains the answer and is never published.",
        es: "Los numeros publicados reproducen un calculo local versionado. Lo que el banco resuelve en su navegador explica la respuesta y nunca se publica.",
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
