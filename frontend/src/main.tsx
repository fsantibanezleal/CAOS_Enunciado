import "@fasl-work/caos-app-shell/styles.css";
import "katex/dist/katex.min.css";
import "./styles.css";
import "./lib/i18n";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import { Layout } from "./App";
import { AppPage } from "./pages/AppPage";
import { BenchmarkPage } from "./pages/BenchmarkPage";
import { ExperimentsPage } from "./pages/ExperimentsPage";
import { ImplementationPage } from "./pages/ImplementationPage";
import { IntroductionPage } from "./pages/IntroductionPage";
import { MethodologyPage } from "./pages/MethodologyPage";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <AppPage /> },
      { path: "/introduction", element: <IntroductionPage /> },
      { path: "/methodology", element: <MethodologyPage /> },
      { path: "/implementation", element: <ImplementationPage /> },
      { path: "/experiments", element: <ExperimentsPage /> },
      { path: "/benchmark", element: <BenchmarkPage /> },
      // A deep link that does not resolve lands on the workbench rather than a blank page.
      { path: "*", element: <AppPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
