import { Suspense } from "react";
import { SupabaseAuthForm } from "@/components/auth/SupabaseAuthForm";

export default function StudentLoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading...</div>}>
      <SupabaseAuthForm role="STUDENT" />
    </Suspense>
  );
}
