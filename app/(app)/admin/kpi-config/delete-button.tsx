"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteKpiConfig } from "./actions";

export function DeleteKpiConfigButton({ id, kpiName }: { id: string; kpiName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Delete the "${kpiName}" KPI config? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteKpiConfig(id);
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="icon" disabled={pending} onClick={handleClick} aria-label="Delete">
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
