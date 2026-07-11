import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthComplete } from "@/components/auth/AuthComplete";

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-muted/30">
          <Loader2 className="h-6 w-6 animate-spin" aria-label="로그인 처리 중" />
        </main>
      }
    >
      <AuthComplete />
    </Suspense>
  );
}
