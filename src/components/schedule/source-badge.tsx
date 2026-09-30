import { Badge } from "@/components/ui";
import type { ScheduleDTO } from "@/lib/schedule/repo";

const TYPE_LABEL = { COURSE: "Kuliah", PRACTICUM: "Praktikum", ASSISTANT: "Asisten", OTHER: "Lainnya" } as const;

export function SourceBadge({ item }: { item: Pick<ScheduleDTO, "source" | "type"> }) {
  if (item.source === "SIAKAD") return <Badge tone="blue">SIAKAD</Badge>;
  const tone = item.type === "PRACTICUM" ? "green" : item.type === "ASSISTANT" ? "purple" : "slate";
  return <Badge tone={tone}>Manual • {TYPE_LABEL[item.type]}</Badge>;
}

export function MatchBadge({ status }: { status: ScheduleDTO["matchStatus"] }) {
  if (status === "AMBIGUOUS") return <Badge tone="amber">Perlu Konfirmasi</Badge>;
  if (status === "UNMATCHED") return <Badge tone="red">Tidak ada di SPS</Badge>;
  return null;
}

export { TYPE_LABEL };
