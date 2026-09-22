/**
 * Bilingual strings. English is canonical, Spanish is a faithful rendering rather than a
 * token-for-token translation.
 *
 * The keys are grouped by surface so a page's strings sit together, which is what makes a missing
 * translation visible when the file is read rather than when the page renders.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const en = {
  nav: {
    app: "Workbench",
    introduction: "Introduction",
    methodology: "Methodology",
    implementation: "Implementation",
    experiments: "Experiments",
    benchmark: "Benchmark",
  },
  common: {
    loading: "Loading the baked cases",
    error: "The artifacts could not be read",
    tier: "Tier",
    trap: "Trap",
    case: "Case",
    objective: "Objective",
    feasible: "Feasible",
    infeasible: "Infeasible, and correctly so",
    noAnswer: "This problem has no answer",
    claimed: "Claimed",
    solved: "Solver returned",
    agrees: "agrees",
    control: "control case, no trap",
  },
  workbench: {
    statement: "Statement",
    formalization: "Formalization",
    solution: "Solution",
    relations: "Relations",
    emitted: "Emitted model",
    properties: "Property relations",
    openQuestions: "What the statement did not determine",
    whyHard: "What makes this hard",
    hoverHint: "Hover a quantity to highlight the words it came from",
    quantities: "Quantities",
    role: "Role",
    dimension: "Dimension",
    value: "Value",
    provenance: "From the narrative",
    inferred: "Inferred, not read from the text",
    noProvenance: "No provenance recorded",
    resolution: "Reading taken",
    stillOpen: "Still open",
    affects: "Affects",
    relationHolds: "holds",
    relationFails: "FAILS",
    relationNotApplicable: "not applicable",
  },
  intro: {
    title: "Executable is not faithful",
    lead:
      "The question this answers is not whether a model produces something that runs. It is whether what runs means what the statement said.",
  },
};

const es = {
  nav: {
    app: "Banco de trabajo",
    introduction: "Introduccion",
    methodology: "Metodologia",
    implementation: "Implementacion",
    experiments: "Experimentos",
    benchmark: "Comparativa",
  },
  common: {
    loading: "Cargando los casos precalculados",
    error: "No se pudieron leer los artefactos",
    tier: "Nivel",
    trap: "Trampa",
    case: "Caso",
    objective: "Objetivo",
    feasible: "Factible",
    infeasible: "Infactible, y correctamente asi",
    noAnswer: "Este problema no tiene respuesta",
    claimed: "Declarado",
    solved: "El solver devolvio",
    agrees: "coincide",
    control: "caso de control, sin trampa",
  },
  workbench: {
    statement: "Enunciado",
    formalization: "Formalizacion",
    solution: "Solucion",
    relations: "Relaciones",
    emitted: "Modelo emitido",
    properties: "Relaciones de propiedad",
    openQuestions: "Lo que el enunciado no determina",
    whyHard: "Que lo hace dificil",
    hoverHint: "Pase el cursor sobre una cantidad para resaltar las palabras de donde proviene",
    quantities: "Cantidades",
    role: "Rol",
    dimension: "Dimension",
    value: "Valor",
    provenance: "Del enunciado",
    inferred: "Inferido, no leido del texto",
    noProvenance: "Sin procedencia registrada",
    resolution: "Lectura tomada",
    stillOpen: "Aun abierta",
    affects: "Afecta a",
    relationHolds: "se cumple",
    relationFails: "FALLA",
    relationNotApplicable: "no aplicable",
  },
  intro: {
    title: "Que se ejecute no es que sea fiel",
    lead:
      "La pregunta no es si un modelo produce algo que se ejecuta. Es si lo que se ejecuta significa lo que decia el enunciado.",
  },
};

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  // English is the default and there is no navigator detection: the shell fixes the language, and
  // a page that silently changes language by locale is a surprise, not a feature.
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
