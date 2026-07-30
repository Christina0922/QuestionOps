import { Suspense } from "react";
import { YouTubeSettingsView } from "@/components/youtube/youtube-settings-view";
import { ListSkeleton } from "@/components/shared/list-skeleton";

export default function YouTubeSettingsPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <YouTubeSettingsView />
    </Suspense>
  );
}
