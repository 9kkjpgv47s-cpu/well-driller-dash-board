import { redirect } from "next/navigation";

/** Field workspace lives on `/` (mono page). Strip query params — jobsite loads via dispatch only. */
export default function DrillingRedirectPage() {
  redirect("/");
}
