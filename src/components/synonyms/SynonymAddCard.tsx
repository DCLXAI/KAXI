"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/routing";

interface SynonymAddCardProps {
  locale: Locale;
  newCategory: string;
  newSource: string;
  newTargets: string;
  onAdd: () => void;
  onCategoryChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onTargetsChange: (value: string) => void;
  onToggle: () => void;
  showAdd: boolean;
}

export function SynonymAddCard({
  locale,
  newCategory,
  newSource,
  newTargets,
  onAdd,
  onCategoryChange,
  onSourceChange,
  onTargetsChange,
  onToggle,
  showAdd,
}: SynonymAddCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{locale === "ko" ? "수동 추가" : "Manual Add"}</CardTitle>
          <Button variant="outline" size="sm" onClick={onToggle}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {showAdd ? (locale === "ko" ? "취소" : "Cancel") : (locale === "ko" ? "추가" : "Add")}
          </Button>
        </div>
      </CardHeader>
      {showAdd && (
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Source (원본)</Label>
              <Input placeholder="예: 돈" value={newSource} onChange={(event) => onSourceChange(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={newCategory} onValueChange={onCategoryChange}>
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">general</SelectItem>
                  <SelectItem value="cost">cost</SelectItem>
                  <SelectItem value="visa">visa</SelectItem>
                  <SelectItem value="documents">documents</SelectItem>
                  <SelectItem value="school">school</SelectItem>
                  <SelectItem value="warning">warning</SelectItem>
                  <SelectItem value="process">process</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Targets (쉼표로 구분)</Label>
            <Textarea
              rows={2}
              placeholder="예: 비용, cost, chi phí, зардал"
              value={newTargets}
              onChange={(event) => onTargetsChange(event.target.value)}
            />
          </div>
          <Button onClick={onAdd} className="w-full">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {locale === "ko" ? "저장" : "Save"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
