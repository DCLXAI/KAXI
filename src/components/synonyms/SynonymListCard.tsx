"use client";

import { Power, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Locale } from "@/i18n/routing";
import type { Synonym } from "./types";

interface SynonymListCardProps {
  category: string;
  loading: boolean;
  locale: Locale;
  onCategoryChange: (value: string) => void;
  onOriginChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onRemove: (id: string) => void;
  onToggleEnabled: (id: string, current: boolean) => void;
  origin: string;
  query: string;
  synonyms: Synonym[];
}

export function SynonymListCard({
  category,
  loading,
  locale,
  onCategoryChange,
  onOriginChange,
  onQueryChange,
  onRemove,
  onToggleEnabled,
  origin,
  query,
  synonyms,
}: SynonymListCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <CardTitle className="text-lg">{locale === "ko" ? "동의어 사전" : "Dictionary"} ({synonyms.length})</CardTitle>
          <div className="md:ml-auto flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search" value={query} onChange={(event) => onQueryChange(event.target.value)} className="pl-8 h-9 w-full sm:w-48" />
            </div>
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger size="sm" className="w-full sm:w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="general">general</SelectItem>
                <SelectItem value="cost">cost</SelectItem>
                <SelectItem value="visa">visa</SelectItem>
                <SelectItem value="documents">documents</SelectItem>
                <SelectItem value="school">school</SelectItem>
                <SelectItem value="warning">warning</SelectItem>
                <SelectItem value="process">process</SelectItem>
              </SelectContent>
            </Select>
            <Select value={origin} onValueChange={onOriginChange}>
              <SelectTrigger size="sm" className="w-full sm:w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All origins</SelectItem>
                <SelectItem value="manual">manual</SelectItem>
                <SelectItem value="auto">auto</SelectItem>
                <SelectItem value="chatlog">chatlog</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">{locale === "ko" ? "로딩 중..." : "Loading..."}</div>
        ) : synonyms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">{locale === "ko" ? "동의어가 없습니다." : "No synonyms."}</div>
        ) : (
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {synonyms.map((synonym) => (
              <div key={synonym.id} className={`flex items-start gap-3 rounded-md border p-2.5 ${!synonym.enabled ? "opacity-50" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="default" className="text-xs">{synonym.source}</Badge>
                    <span className="text-xs text-muted-foreground">→</span>
                    <div className="flex flex-wrap gap-1">
                      {synonym.targets.slice(0, 6).map((target, index) => (
                        <Badge key={`${target}-${index}`} variant="outline" className="text-[10px]">{target}</Badge>
                      ))}
                      {synonym.targets.length > 6 && <Badge variant="outline" className="text-[10px]">+{synonym.targets.length - 6}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{synonym.category}</Badge>
                    <Badge variant="outline" className="text-[10px]">{synonym.origin}</Badge>
                    {synonym.autoMeta?.confidence && (
                      <span className="text-[10px] text-muted-foreground">conf: {(synonym.autoMeta.confidence * 100).toFixed(0)}%</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onToggleEnabled(synonym.id, synonym.enabled)} title={synonym.enabled ? "비활성화" : "활성화"}>
                    <Power className={`h-3.5 w-3.5 ${synonym.enabled ? "text-green-600" : "text-muted-foreground"}`} />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onRemove(synonym.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
