"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { defaultLocale, isLocale } from "@/i18n/routing";
import type { School } from "@/lib/data/schools";

export function useSchoolsDirectory() {
  const activeLocale = useLocale();
  const locale = isLocale(activeLocale) ? activeLocale : defaultLocale;
  const [region, setRegion] = useState("all");
  const [program, setProgram] = useState("all");
  const [accreditation, setAccreditation] = useState("all");
  const [maxTuition, setMaxTuition] = useState(6000000);
  const [schools, setSchools] = useState<School[]>([]);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState("");
  const [operational, setOperational] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      region,
      program,
      accreditation,
      maxTuition: String(maxTuition),
    });

    fetch(`/api/schools?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load schools");
        return res.json();
      })
      .then((data) => {
        setSchools(data.schools || []);
        setTotal(Number(data.total || 0));
        setSource(data.source || "");
        setOperational(!!data.operational);
        setError(null);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        console.error("[schools]", error);
        setError(locale === "ko" ? "학교 데이터를 불러오지 못했습니다." : "Could not load school data.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [accreditation, locale, maxTuition, program, region]);

  const reset = () => {
    setRegion("all");
    setProgram("all");
    setAccreditation("all");
    setMaxTuition(6000000);
  };

  return {
    accreditation,
    error,
    loading,
    locale,
    maxTuition,
    operational,
    program,
    region,
    reset,
    schools,
    setAccreditation,
    setMaxTuition,
    setProgram,
    setRegion,
    source,
    total,
  };
}
