import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { EntryEditor } from "@/features/journal/components/entry-editor";
import {
  getDistinctTags,
  getEntryById,
} from "@/features/journal/server/queries";

export default async function EditJournalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Block on the entry (we need its title for the page header). Pass tags
  // as an UNawaited Promise — the editor unwraps it via use() inside a
  // <Suspense> boundary, so suggestions don't gate TTFB.
  const entry = await getEntryById(id);
  if (!entry) notFound();
  const knownTagsPromise = getDistinctTags();
  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        title={entry.title || "Untitled entry"}
        subtitle="Edit your thoughts."
      />
      <div className="flex-1 overflow-y-auto">
        <EntryEditor
          mode="edit"
          knownTagsPromise={knownTagsPromise}
          initial={{
            id: entry.id,
            title: entry.title,
            content: entry.content,
            mood: entry.mood,
            imageUrl: entry.imageUrl,
            tags: entry.tags,
          }}
        />
      </div>
    </div>
  );
}
