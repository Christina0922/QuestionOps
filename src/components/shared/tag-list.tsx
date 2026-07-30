import { Badge } from "@/components/ui/badge";

export function TagList({ tags }: { tags: Array<{ id: string; name: string }> }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Badge key={tag.id} variant="secondary">
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}
