"use client";

import { AlertTriangle, Info } from "lucide-react";

type Alert = {
  type: "warning" | "info";
  message: string;
};

const alertIcons = {
  warning: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />,
  info: <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
};

const alertStyles = {
  warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/70 dark:text-amber-200",
  info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900/70 dark:text-blue-200"
};

export function AlertsSection({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">Alertas</h2>
      <div className="flex flex-col gap-2">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${alertStyles[alert.type]}`}
          >
            {alertIcons[alert.type]}
            <span>{alert.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
