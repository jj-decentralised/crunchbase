import { isAuthorized } from "@/lib/auth";
import { DealsBrowser } from "@/components/deals/deals-browser";
import { AccessGate } from "@/components/deals/access-gate";

export default async function DealsPage() {
  const authorized = await isAuthorized();
  if (!authorized) {
    return <AccessGate />;
  }
  return <DealsBrowser />;
}
