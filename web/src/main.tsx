import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import "./index.css";
import { PersonaProvider } from "./lib/persona";
import Catalogue from "./pages/Catalogue";
import Dashboard from "./pages/Dashboard";
import EstimateDetail from "./pages/EstimateDetail";
import EstimatesList from "./pages/EstimatesList";
import NewEstimate from "./pages/NewEstimate";
import Pricing from "./pages/Pricing";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10_000 } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* Persona change refetches everything so role-shaped responses update immediately */}
      <PersonaProvider onChange={() => queryClient.invalidateQueries()}>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="estimates" element={<EstimatesList />} />
              <Route path="estimates/new" element={<NewEstimate />} />
              <Route path="estimates/:id" element={<EstimateDetail />} />
              <Route path="catalogue" element={<Catalogue />} />
              <Route path="pricing" element={<Pricing />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PersonaProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
