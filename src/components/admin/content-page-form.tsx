"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { FileText, LayoutTemplate, LoaderCircle, Save } from "lucide-react";
import {
  createContentPageAction,
  updateContentPageAction,
} from "@/actions/admin/content-pages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { FormAlert } from "@/components/auth/form-message";
import type { ContentPageFormState } from "@/validators/content-page";

type PageType = "TEXT" | "LANDING";

export type ContentPageInitial = {
  slug: string;
  title: string;
  type: PageType;
  content: string;
  html: string;
  css: string;
  js: string;
  useTailwindCdn: boolean;
};

const EMPTY: ContentPageInitial = {
  slug: "",
  title: "",
  type: "TEXT",
  content: "",
  html: "",
  css: "",
  js: "",
  useTailwindCdn: false,
};

const TYPE_OPTIONS: {
  value: PageType;
  label: string;
  blurb: string;
  icon: typeof FileText;
}[] = [
  {
    value: "TEXT",
    label: "Text content",
    blurb: "Simple about, contact or policy page using headings and lists.",
    icon: FileText,
  },
  {
    value: "LANDING",
    label: "Landing page",
    blurb: "Custom HTML, CSS and JavaScript for a designed landing page.",
    icon: LayoutTemplate,
  },
];

export function ContentPageForm({
  id,
  initial,
  canCreateLanding,
}: {
  id?: string;
  initial?: ContentPageInitial;
  canCreateLanding: boolean;
}) {
  const router = useRouter();
  const seed: ContentPageInitial = useMemo(() => initial ?? EMPTY, [initial]);

  const [title, setTitle] = useState(seed.title);
  const [slug, setSlug] = useState(seed.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [type, setType] = useState<PageType>(seed.type);
  const [content, setContent] = useState(seed.content);
  const [html, setHtml] = useState(seed.html);
  const [css, setCss] = useState(seed.css);
  const [js, setJs] = useState(seed.js);
  const [useTailwindCdn, setUseTailwindCdn] = useState(seed.useTailwindCdn);

  const [state, action, pending] = useActionState<ContentPageFormState, FormData>(
    (prev, formData) =>
      id
        ? updateContentPageAction(id, prev, formData)
        : createContentPageAction(prev, formData),
    { ok: false }
  );

  useEffect(() => {
    if (state.ok) router.push("/admin/pages");
  }, [state.ok, router]);

  const slugify = (v: string) => {
    const s = v
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slugTouched) setSlug(s);
  };

  const isLanding = type === "LANDING";
  const bodyReady = useMemo(
    () => (isLanding ? html.trim().length > 0 : content.trim().length > 0),
    [isLanding, html, content]
  );
  const canSubmit =
    !pending && title.trim().length > 0 && slug.trim().length > 0 && bodyReady;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.ok === false && state.error ? (
        <FormAlert message={{ en: state.error, bn: "" }} />
      ) : null}

      <input type="hidden" name="type" value={type} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Page type</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const disabled = option.value === "LANDING" && !canCreateLanding;
            return (
              <label
                key={option.value}
                className={`flex gap-3 rounded-lg border p-3 ${
                  disabled
                    ? "border-border cursor-not-allowed opacity-60"
                    : "border-border has-checked:border-primary has-checked:bg-accent/40 hover:bg-accent/30 cursor-pointer"
                }`}
              >
                <input
                  type="radio"
                  name="pageTypeChoice"
                  value={option.value}
                  checked={type === option.value}
                  disabled={disabled}
                  onChange={() => setType(option.value)}
                  className="mt-1"
                />
                <span className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Icon className="size-4" aria-hidden="true" />
                    {option.label}
                  </span>
                  <span className="text-muted-foreground text-xs">{option.blurb}</span>
                  {disabled ? (
                    <span className="text-muted-foreground text-xs">
                      Landing pages require a super admin.
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            slugify(e.target.value);
          }}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          placeholder="about"
          className="font-mono"
          required
        />
        <p className="text-muted-foreground text-xs">
          Page will be live at <span className="font-mono">/pages/{slug || "…"}</span>
        </p>
      </div>

      {isLanding ? (
        <>
          <input type="hidden" name="content" value="" />

          <Tabs defaultValue="html" className="flex flex-col gap-2">
            <TabsList className="w-fit">
              <TabsTab value="html">HTML</TabsTab>
              <TabsTab value="css">CSS</TabsTab>
              <TabsTab value="js">JavaScript</TabsTab>
            </TabsList>

            {/* keepMounted keeps inactive textareas in the DOM so the CSS and JS
                values still submit with the form. */}
            <TabsPanel value="html" keepMounted className="space-y-1.5">
              <Label htmlFor="html">HTML</Label>
              <Textarea
                id="html"
                name="html"
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                placeholder='<section class="hero">…</section>'
                className="field-sizing-fixed min-h-[320px] font-mono text-sm"
                required
              />
              <p className="text-muted-foreground text-xs">
                Rendered as-is on a full-width page with no site header or footer.
              </p>
            </TabsPanel>

            <TabsPanel value="css" keepMounted className="space-y-1.5">
              <Label htmlFor="css">CSS</Label>
              <Textarea
                id="css"
                name="css"
                value={css}
                onChange={(e) => setCss(e.target.value)}
                placeholder=".hero { background: #0f172a; }"
                className="field-sizing-fixed min-h-[320px] font-mono text-sm"
              />
              <p className="text-muted-foreground text-xs">
                Injected in the components layer, so Tailwind utilities still win over
                these rules.
              </p>
            </TabsPanel>

            <TabsPanel value="js" keepMounted className="space-y-1.5">
              <Label htmlFor="js">JavaScript</Label>
              <Textarea
                id="js"
                name="js"
                value={js}
                onChange={(e) => setJs(e.target.value)}
                placeholder="document.querySelectorAll('[data-tab]')…"
                className="field-sizing-fixed min-h-[320px] font-mono text-sm"
              />
              <p className="text-muted-foreground text-xs">
                Runs in the visitor&apos;s browser on every visit. Only super admins can
                edit this.
              </p>
            </TabsPanel>
          </Tabs>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="useTailwindCdn"
              checked={useTailwindCdn}
              onChange={(e) => setUseTailwindCdn(e.target.checked)}
              className="size-3.5"
            />
            Load Tailwind CSS from the CDN so utility classes work in the HTML
          </label>
        </>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              "Start a line with ## for a subheading, - for list items.\n\nBlank lines separate paragraphs."
            }
            className="field-sizing-fixed min-h-[280px] font-mono text-sm"
            required
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {pending ? (
            <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="mr-2 size-4" aria-hidden="true" />
          )}
          {id ? "Save changes" : "Create page"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/pages")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
