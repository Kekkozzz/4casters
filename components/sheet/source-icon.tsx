import { Globe, Youtube, Twitter } from "@/components/ui/icons";
import type { SourceType } from "@/types/sheet";

/**
 * Maps a SourceRef.srcType to a small icon used inside SourceChip.
 * Liquipedia, Ballchasing, and BLAST share the generic globe; YouTube and Twitter
 * use the brand-adjacent placeholders (lucide 1.x dropped brand icons).
 */
export function SourceIcon({ srcType }: { srcType: SourceType }) {
  if (srcType === "youtube") return <Youtube size={11} />;
  if (srcType === "twitter") return <Twitter size={11} />;
  return <Globe size={11} />;
}
