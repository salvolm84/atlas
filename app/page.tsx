import Atlas from "./atlas";
import {romeDate} from "@/lib/sky";
export default function Page(){return <Atlas initialDate={romeDate(new Date())}/>;}
