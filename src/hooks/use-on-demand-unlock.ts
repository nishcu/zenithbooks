import { useEffect } from "react";

type OnDemandUnlock =
  | {
      type: "plan";
      planId: string;
      at?: number;
    }
  | {
      type: string;
      [key: string]: any;
    };

/**
 * Used to resume UI after Cashfree redirect to /payment/success.
 * /payment/success sets `on_demand_unlock` in localStorage, then redirects back to the originating page.
 */
export function useOnDemandUnlock(planIds: string | string[], onUnlock: () => void) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem("on_demand_unlock");
      if (!raw) return;
      const unlock: OnDemandUnlock = JSON.parse(raw);

      const ids = Array.isArray(planIds) ? planIds : [planIds];
      if (unlock?.type === "plan" && typeof unlock.planId === "string" && ids.includes(unlock.planId)) {
        onUnlock();
        localStorage.removeItem("on_demand_unlock");
      }
    } catch {
      // ignore
    }
  }, [planIds, onUnlock]);
}


