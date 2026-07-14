import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { UnifiedAuthForm } from "@/components/auth/UnifiedAuthForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <UnifiedAuthForm />
    </Suspense>
  );
}
