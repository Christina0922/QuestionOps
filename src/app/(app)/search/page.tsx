import { Suspense } from "react";
import { SearchView } from "@/components/search/search-view";
import { Loading } from "@/components/ui/loading";

export default function SearchPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SearchView />
    </Suspense>
  );
}
