import { describe, expect, it } from "vitest";
import { htmlToPlainText } from "@/lib/html-plain-text";

describe("htmlToPlainText", () => {
  it("returns plain text for empty input", () => {
    expect(htmlToPlainText("")).toBe("");
  });

  it("keeps visible text", () => {
    expect(htmlToPlainText("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });

  it("separates block elements with whitespace", () => {
    expect(htmlToPlainText("<h1>Title</h1><p>Body</p>")).toBe("Title Body");
  });

  it("decodes common entities", () => {
    expect(htmlToPlainText("<p>Tea &amp; biscuits &lt;3</p>")).toBe(
      "Tea & biscuits <3"
    );
  });

  it("drops script and style bodies", () => {
    expect(htmlToPlainText("<style>body{color:red}</style><p>Visible</p>")).toBe(
      "Visible"
    );
    expect(htmlToPlainText("<script>alert('x')</script><p>Visible</p>")).toBe(
      "Visible"
    );
  });

  it("drops comments", () => {
    expect(htmlToPlainText("<p>A</p><!-- secret --><p>B</p>")).toBe("A B");
  });

  it("collapses runs of whitespace", () => {
    expect(htmlToPlainText("<div>  a   \n\n  b  </div>")).toBe("a b");
  });

  it("truncates nothing on its own", () => {
    const long = "<p>" + "word ".repeat(100) + "</p>";
    expect(htmlToPlainText(long).length).toBeGreaterThan(160);
  });
});
