import Link from "next/link";
import { KaxiCat } from "@/components/brand/KaxiCat";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <KaxiCat state="napz" size={72} label="잠자는 고양이" />
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">페이지를 찾을 수 없어요</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          주소가 바뀌었거나 존재하지 않는 페이지예요.
          <br />Page not found · Không tìm thấy trang · Хуудас олдсонгүй
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">홈으로</Link>
        <Link href="/ko/diagnose" className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground">3분 진단 시작</Link>
      </div>
    </main>
  );
}
