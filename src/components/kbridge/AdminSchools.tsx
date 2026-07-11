"use client";

import { useCallback, useEffect, useState } from "react";
import type { School } from "@/lib/data/schools";
import { useLangStore } from "@/store/kbridge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Edit3, RefreshCw, Save, Trash2 } from "lucide-react";

interface SchoolForm {
  id: string;
  nameKo: string;
  nameEn: string;
  region: string;
  program: string;
  tuitionPerSemester: string;
  dormitoryAvailable: boolean;
  dormitoryCost: string;
  koreanRequirement: string;
  accreditation: "accredited" | "standard" | "caution";
  topikLevel: string;
  intake: string;
  officialUrl: string;
  sourceUrl: string;
  verifiedAt: string;
  reviewAfter: string;
  notesKo: string;
  notesEn: string;
}

const EMPTY_FORM: SchoolForm = {
  id: "",
  nameKo: "",
  nameEn: "",
  region: "seoul",
  program: "language",
  tuitionPerSemester: "0",
  dormitoryAvailable: false,
  dormitoryCost: "",
  koreanRequirement: "",
  accreditation: "standard",
  topikLevel: "",
  intake: "봄,가을",
  officialUrl: "",
  sourceUrl: "",
  verifiedAt: new Date().toISOString().slice(0, 10),
  reviewAfter: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
  notesKo: "",
  notesEn: "",
};

function schoolToForm(school: School): SchoolForm {
  return {
    id: school.id,
    nameKo: school.name.ko,
    nameEn: school.name.en,
    region: school.region,
    program: school.program,
    tuitionPerSemester: String(school.tuitionPerSemester),
    dormitoryAvailable: school.dormitoryAvailable,
    dormitoryCost: school.dormitoryCost ? String(school.dormitoryCost) : "",
    koreanRequirement: school.koreanRequirement,
    accreditation: school.accreditation,
    topikLevel: school.topikLevel ? String(school.topikLevel) : "",
    intake: school.intake.join(","),
    officialUrl: school.officialUrl,
    sourceUrl: school.sourceUrl || school.officialUrl,
    verifiedAt: school.verifiedAt || EMPTY_FORM.verifiedAt,
    reviewAfter: school.reviewAfter || EMPTY_FORM.reviewAfter,
    notesKo: school.notes.ko,
    notesEn: school.notes.en,
  };
}

function formToPayload(form: SchoolForm) {
  const nameKo = form.nameKo.trim();
  const nameEn = form.nameEn.trim() || nameKo;
  const notesKo = form.notesKo.trim() || "관리자 입력 데이터";
  const notesEn = form.notesEn.trim() || notesKo;

  return {
    id: form.id.trim(),
    name: { ko: nameKo, vi: nameKo, mn: nameKo, en: nameEn },
    region: form.region,
    program: form.program,
    tuitionPerSemester: Number(form.tuitionPerSemester) || 0,
    dormitoryAvailable: form.dormitoryAvailable,
    dormitoryCost: form.dormitoryCost ? Number(form.dormitoryCost) : null,
    koreanRequirement: form.koreanRequirement.trim() || "확인 필요",
    accreditation: form.accreditation,
    topikLevel: form.topikLevel ? Number(form.topikLevel) : null,
    intake: form.intake.split(",").map((item) => item.trim()).filter(Boolean),
    officialUrl: form.officialUrl.trim(),
    sourceUrl: form.sourceUrl.trim() || form.officialUrl.trim(),
    verifiedAt: form.verifiedAt,
    reviewAfter: form.reviewAfter,
    notes: { ko: notesKo, vi: notesKo, mn: notesKo, en: notesEn },
  };
}

export function AdminSchools() {
  const { lang } = useLangStore();
  const [schools, setSchools] = useState<School[]>([]);
  const [form, setForm] = useState<SchoolForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/schools");
      if (!res.ok) throw new Error("Failed to load schools");
      const data = await res.json();
      setSchools(data.schools || []);
    } catch (err) {
      console.error("[admin schools]", err);
      setMessage(lang === "ko" ? "학교 데이터를 불러오지 못했습니다." : "Could not load schools.");
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    load();
  }, [load]);

  const reset = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setMessage(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = formToPayload(form);
      const res = await fetch(editingId ? `/api/schools/${editingId}` : "/api/schools", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed");
      }
      await load();
      reset();
      setMessage(lang === "ko" ? "학교 데이터가 저장되었습니다." : "School saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(lang === "ko" ? "이 학교 데이터를 삭제할까요?" : "Delete this school?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/schools/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      await load();
      if (editingId === id) reset();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{lang === "ko" ? "학교 데이터" : "School Data"}</CardTitle>
            <CardDescription>
              {lang === "ko" ? "출처, 검증일, 재검토일을 포함한 운영 DB 관리" : "Manage source metadata and review dates."}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            {lang === "ko" ? "새로고침" : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {message && (
          <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label>ID</Label>
            <Input value={form.id} disabled={Boolean(editingId)} onChange={(e) => setForm({ ...form, id: e.target.value })} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>{lang === "ko" ? "이름" : "Name"}</Label>
            <Input value={form.nameKo} onChange={(e) => setForm({ ...form, nameKo: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>English</Label>
            <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "ko" ? "지역" : "Region"}</Label>
            <Select value={form.region} onValueChange={(region) => setForm({ ...form, region })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["seoul", "gyeonggi", "busan", "daegu", "gwangju", "other"].map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "ko" ? "과정" : "Program"}</Label>
            <Select value={form.program} onValueChange={(program) => setForm({ ...form, program })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["language", "college", "university", "graduate", "vocational"].map((value) => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "ko" ? "인증" : "Accreditation"}</Label>
            <Select value={form.accreditation} onValueChange={(accreditation) => setForm({ ...form, accreditation: accreditation as SchoolForm["accreditation"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="accredited">accredited</SelectItem>
                <SelectItem value="standard">standard</SelectItem>
                <SelectItem value="caution">caution</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "ko" ? "학비" : "Tuition"}</Label>
            <Input inputMode="numeric" value={form.tuitionPerSemester} onChange={(e) => setForm({ ...form, tuitionPerSemester: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "ko" ? "TOPIK" : "TOPIK"}</Label>
            <Input inputMode="numeric" value={form.topikLevel} onChange={(e) => setForm({ ...form, topikLevel: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "ko" ? "기숙사비" : "Dorm cost"}</Label>
            <Input inputMode="numeric" value={form.dormitoryCost} onChange={(e) => setForm({ ...form, dormitoryCost: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 pt-7">
            <Checkbox
              checked={form.dormitoryAvailable}
              onCheckedChange={(checked) => setForm({ ...form, dormitoryAvailable: Boolean(checked) })}
            />
            <Label>{lang === "ko" ? "기숙사 있음" : "Dorm available"}</Label>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>{lang === "ko" ? "한국어 요건" : "Korean requirement"}</Label>
            <Input value={form.koreanRequirement} onChange={(e) => setForm({ ...form, koreanRequirement: e.target.value })} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>{lang === "ko" ? "입학시기" : "Intake"}</Label>
            <Input value={form.intake} onChange={(e) => setForm({ ...form, intake: e.target.value })} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>{lang === "ko" ? "공식 URL" : "Official URL"}</Label>
            <Input value={form.officialUrl} onChange={(e) => setForm({ ...form, officialUrl: e.target.value })} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>{lang === "ko" ? "출처 URL" : "Source URL"}</Label>
            <Input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "ko" ? "검증일" : "Verified at"}</Label>
            <Input type="date" value={form.verifiedAt} onChange={(e) => setForm({ ...form, verifiedAt: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "ko" ? "재검토일" : "Review after"}</Label>
            <Input type="date" value={form.reviewAfter} onChange={(e) => setForm({ ...form, reviewAfter: e.target.value })} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>{lang === "ko" ? "메모" : "Notes"}</Label>
            <Textarea rows={2} value={form.notesKo} onChange={(e) => setForm({ ...form, notesKo: e.target.value })} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {editingId ? (lang === "ko" ? "수정 저장" : "Update") : lang === "ko" ? "새 학교 저장" : "Create"}
          </Button>
          <Button variant="outline" onClick={reset} disabled={saving}>
            {lang === "ko" ? "초기화" : "Reset"}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">ID</th>
                <th className="py-2 pr-3 font-medium">{lang === "ko" ? "학교" : "School"}</th>
                <th className="py-2 pr-3 font-medium">{lang === "ko" ? "상태" : "Status"}</th>
                <th className="py-2 pr-3 font-medium">{lang === "ko" ? "검증" : "Verified"}</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {schools.slice(0, 80).map((school) => (
                <tr key={school.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-mono text-xs">{school.id}</td>
                  <td className="py-2 pr-3">
                    <div className="font-medium">{school.name.ko}</div>
                    <div className="text-xs text-muted-foreground">{school.region} · {school.program}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <Badge variant={school.accreditation === "caution" ? "destructive" : "outline"}>{school.accreditation}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                    {school.verifiedAt} / {school.reviewAfter}
                  </td>
                  <td className="py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(school.id); setForm(schoolToForm(school)); }}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(school.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
