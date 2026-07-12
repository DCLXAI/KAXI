import { KcatActionCat } from "@/components/brand/KcatActionCat";

export function KcatParade() {
  return (
    <div
      data-testid="home-kcat-parade"
      aria-hidden="true"
      className="mx-auto mt-5 flex h-[76px] max-w-[360px] items-end justify-between px-3 sm:max-w-[430px] sm:px-5"
    >
      <KcatActionCat clip="stretch" size={56} pauseMs={1800} />
      <KcatActionCat clip="lookAround" size={50} pauseMs={2300} flip className="mb-1" />
      <KcatActionCat clip="groom" size={58} pauseMs={2600} />
      <KcatActionCat clip="sleepLoop" size={53} flip className="mb-0.5" />
    </div>
  );
}
