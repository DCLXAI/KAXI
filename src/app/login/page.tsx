import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { UnifiedAuthForm } from "@/components/auth/UnifiedAuthForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <UnifiedAuthForm />
    </Suspense>
  );
}
