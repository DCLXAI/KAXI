import { redirect } from "next/navigation";
import { localePath, defaultLocale } from "@/i18n/routing";

export default function Home() {
  redirect(localePath(defaultLocale));
}
