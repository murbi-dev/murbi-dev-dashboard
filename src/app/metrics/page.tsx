import { Suspense } from "react";
import { MetricsPageShell } from "./components/MetricsPageShell";

export default function MetricsPage() {
  return (
    <Suspense fallback={null}>
      <MetricsPageShell />
    </Suspense>
  );
}
