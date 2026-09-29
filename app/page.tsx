import Atlas from "./atlas";
import { MODENA, siteDate } from "@/lib/sky";
import { ErrorBoundary } from "@/components/error-boundary";
export default function Page() {
  return (
    <ErrorBoundary area="L’atlante">
      <Atlas initialDate={siteDate(new Date(), MODENA)} />
    </ErrorBoundary>
  );
}
