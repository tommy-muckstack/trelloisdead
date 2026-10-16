import { Suspense } from "react";
import { TemplatesPage } from "@/components/app/TemplatesPage";
export const metadata = { title: "Templates | TrelloIsDead" };
export default function Page() { return <Suspense><TemplatesPage /></Suspense>; }
