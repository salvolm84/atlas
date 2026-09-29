import Atlas from "./atlas";
import {romeDate} from "@/lib/sky";
import {ErrorBoundary} from "@/components/error-boundary";
export default function Page(){return <ErrorBoundary area="L’atlante"><Atlas initialDate={romeDate(new Date())}/></ErrorBoundary>;}
