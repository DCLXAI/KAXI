import { KaxiCat } from "@/components/brand/KaxiCat";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background">
      <KaxiCat state="running" size={56} label="불러오는 중" />
    </div>
  );
}
