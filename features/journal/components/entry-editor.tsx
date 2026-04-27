"use client";

import { Suspense, use, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MOODS, type MoodValue } from "@/features/journal/schema";
import {
  createEntry,
  deleteEntry,
  updateEntry,
} from "@/features/journal/server/actions";

type Initial = {
  id: string;
  title: string | null;
  content: string;
  mood: number | null;
  imageUrl: string | null;
  tags: string[];
};

export function EntryEditor({
  mode,
  initial,
  knownTagsPromise,
}: {
  mode: "create" | "edit";
  initial?: Initial;
  // The page passes this WITHOUT awaiting so it doesn't block TTFB. The
  // <TagSuggestions> child unwraps it via React 19's use() inside a Suspense
  // boundary — suggestions appear when the query resolves; everything else
  // paints immediately.
  knownTagsPromise: Promise<string[]>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [mood, setMood] = useState<number | null>(initial?.mood ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(
    initial?.imageUrl ?? null,
  );
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Drag & drop wiring
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    function onOver(e: DragEvent) {
      e.preventDefault();
      el?.classList.add("ring-2", "ring-primary");
    }
    function onLeave() {
      el?.classList.remove("ring-2", "ring-primary");
    }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      el?.classList.remove("ring-2", "ring-primary");
      const f = e.dataTransfer?.files?.[0];
      if (f) void handleFile(f);
    }
    el.addEventListener("dragover", onOver);
    el.addEventListener("dragleave", onLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onOver);
      el.removeEventListener("dragleave", onLeave);
      el.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Upload failed");
      setImageUrl(json.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function addTag(t: string) {
    const trimmed = t.trim().slice(0, 40);
    if (!trimmed) return;
    if (tags.includes(trimmed)) return;
    setTags([...tags, trimmed]);
  }
  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  function onSave() {
    setError(null);
    if (!content.trim()) {
      setError("Write something before saving.");
      return;
    }
    start(async () => {
      try {
        if (mode === "edit" && initial) {
          await updateEntry({
            id: initial.id,
            title: title.trim() || null,
            content,
            mood: mood as MoodValue | null,
            imageUrl: imageUrl ?? null,
            tags,
          });
          // updateEntry calls revalidatePath('/journal') + the entry page —
          // the next navigation reads fresh data, no router.refresh() needed.
          router.push(`/journal`);
        } else {
          const id = await createEntry({
            title: title.trim() || null,
            content,
            mood: mood as MoodValue | null,
            imageUrl: imageUrl ?? null,
            tags,
          });
          router.push(`/journal/${id}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  function onDelete() {
    if (!initial) return;
    if (!confirm(`Delete "${title || "this entry"}"? This can't be undone.`))
      return;
    start(async () => {
      await deleteEntry(initial.id);
    });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 pb-8 pt-4 sm:px-6">
      <div className="flex items-center justify-between">
        <Link
          href="/journal"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to journal
        </Link>
        <div className="flex items-center gap-2">
          {mode === "edit" && (
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-kpi-red/40 px-3 py-1.5 text-[12px] font-semibold text-kpi-red hover:bg-kpi-red/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-soft disabled:opacity-60"
          >
            {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Publish entry"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-kpi-red/30 bg-kpi-red/10 px-3 py-2 text-[12px] text-kpi-red">
          {error}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label className="text-[12px] text-muted-foreground">Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give today's reflection a title…"
          className="text-[18px] font-bold"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[12px] text-muted-foreground">How are you feeling?</Label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(mood === m.value ? null : m.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                mood === m.value
                  ? "border-primary bg-primary/15 text-primary-soft"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="text-[15px] leading-none">{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[12px] text-muted-foreground">Body</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind today?"
          className="min-h-[260px] resize-y leading-relaxed"
        />
        <div className="text-[10.5px] text-muted-foreground-strong">
          {content.trim().split(/\s+/).filter(Boolean).length} words
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[12px] text-muted-foreground">Tags</Label>
        <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-card px-2 py-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-white/[0.03] px-2 py-0.5 text-[11px] font-semibold"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                aria-label={`Remove tag ${t}`}
                className="text-muted-foreground-strong hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagInput);
                setTagInput("");
              } else if (
                e.key === "Backspace" &&
                tagInput === "" &&
                tags.length > 0
              ) {
                removeTag(tags[tags.length - 1]);
              }
            }}
            placeholder={tags.length === 0 ? "Add tags (press Enter)…" : ""}
            className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-[12.5px] outline-none placeholder:text-muted-foreground-strong"
          />
        </div>
        {tagInput && (
          <Suspense fallback={null}>
            <TagSuggestions
              promise={knownTagsPromise}
              input={tagInput}
              applied={tags}
              onPick={(t) => {
                addTag(t);
                setTagInput("");
              }}
            />
          </Suspense>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-[12px] text-muted-foreground">Photo (optional)</Label>
        <div
          ref={dropRef}
          className="relative rounded-md border border-dashed border-border bg-card px-4 py-6"
        >
          {imageUrl ? (
            <div className="flex items-start gap-3">
              <div className="relative h-32 w-44 overflow-hidden rounded-md">
                <Image
                  src={imageUrl}
                  alt="Entry photo"
                  fill
                  className="object-cover"
                  sizes="176px"
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-kpi-red/40 px-3 py-1.5 text-[12px] font-medium text-kpi-red hover:bg-kpi-red/10"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 text-muted-foreground-strong hover:text-foreground"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ImagePlus className="h-5 w-5" />
              )}
              <span className="text-[12px] font-medium">
                {uploading
                  ? "Uploading…"
                  : "Click or drag-drop a photo (PNG / JPG / WEBP, ≤5MB)"}
              </span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </div>
        {uploadError ? (
          <div className="text-[11px] text-kpi-red">{uploadError}</div>
        ) : null}
      </div>
    </div>
  );
}

// Suspends only the suggestions chip row — everything else in the editor
// renders immediately. Once the tags Promise resolves the row pops in;
// fallback is null so there's no shimmer.
function TagSuggestions({
  promise,
  input,
  applied,
  onPick,
}: {
  promise: Promise<string[]>;
  input: string;
  applied: string[];
  onPick: (t: string) => void;
}) {
  const knownTags = use(promise);
  const lower = input.toLowerCase();
  const suggestions = knownTags.filter(
    (t) => !applied.includes(t) && t.toLowerCase().includes(lower),
  );
  if (suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {suggestions.slice(0, 6).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className="rounded-md border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-primary/10 hover:text-foreground"
        >
          + {t}
        </button>
      ))}
    </div>
  );
}
