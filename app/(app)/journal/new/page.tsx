import { PageHeader } from "@/components/page-header";
import { EntryEditor } from "@/features/journal/components/entry-editor";
import { getDistinctTags } from "@/features/journal/server/queries";

export default function NewJournalPage() {
  // Pass tags as an UNawaited Promise so the editor renders immediately;
  // suggestions stream in via Suspense + use() once the query resolves.
  const knownTagsPromise = getDistinctTags();
  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        title="New Entry"
        subtitle="Write freely. Reflect deeply. Grow daily."
      />
      <div className="flex-1 overflow-y-auto">
        <EntryEditor mode="create" knownTagsPromise={knownTagsPromise} />
      </div>
    </div>
  );
}
