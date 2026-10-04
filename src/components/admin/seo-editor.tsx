"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input as InputUi } from "@/components/ui/input";
import { Textarea as TextareaUi } from "@/components/ui/textarea";

function trimTo(s: string, limit: number): string {
  return s.length <= limit ? s : `${s.slice(0, limit).trimEnd()}…`;
}

function Counter({ count, limit }: { count: number; limit: number }) {
  const tone =
    count === 0 ? "text-muted-foreground" : count > limit ? "text-destructive" : "text-emerald-700";
  return (
    <span className={cn("text-xs tabular-nums", tone)}>
      {count}/{limit}
    </span>
  );
}

export function SeoEditor({
  siteName,
  urlSuffix,
  titleName = "seoTitle",
  descriptionName = "seoDescription",
  titleLimit = 60,
  descriptionLimit = 160,
  defaultTitle = "",
  defaultDescription = "",
  fallbackDescription = "",
  titlePlaceholder = "",
  descriptionPlaceholder = "",
}: {
  siteName: string;
  urlSuffix: string;
  titleName?: string;
  descriptionName?: string;
  titleLimit?: number;
  descriptionLimit?: number;
  defaultTitle?: string;
  defaultDescription?: string;
  fallbackDescription?: string;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);

  const titleCount = title.trim().length;
  const descCount = description.trim().length;
  const previewTitle = title.trim() || `— ${siteName}`;
  const previewDesc = trimTo(
    description.trim() || trimTo(fallbackDescription.replace(/\n+/g, " "), descriptionLimit),
    descriptionLimit
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={titleName}>Meta title</Label>
          <Counter count={titleCount} limit={titleLimit} />
        </div>
        <InputUi
          id={titleName}
          name={titleName}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePlaceholder}
        />
        {titleCount > titleLimit && (
          <p className="text-destructive flex items-center gap-1 text-xs">
            <AlertCircle className="size-3" aria-hidden="true" />
            Title is longer than {titleLimit} characters — it may be truncated in search results.
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={descriptionName}>Meta description</Label>
          <Counter count={descCount} limit={descriptionLimit} />
        </div>
        <TextareaUi
          id={descriptionName}
          name={descriptionName}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={descriptionPlaceholder}
        />
      </div>

      <div className="border-border bg-muted/40 rounded-lg border p-4">
        <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
          Search result preview
        </p>
        <p className="text-foreground/70 break-all text-xs">
          {trimTo(urlSuffix, 60)}
        </p>
        <p className="text-[#1a0dab] leading-snug break-words text-lg">
          {trimTo(previewTitle, titleLimit > 70 ? 70 : titleLimit || 60)}
        </p>
        <p className="text-muted-foreground text-sm">{previewDesc}</p>
      </div>
    </div>
  );
}