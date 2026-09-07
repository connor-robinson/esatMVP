/**
 * @vitest-environment jsdom
 */

import {
  act,
  createElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublishedConversionTablesClient } from "@/components/tools/scoreConverter/PublishedConversionTablesClient";
import type { PublishedTableRow } from "@/lib/scoreConverter/publishedTables.shared";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => createElement("a", { href, ...props }, children),
}));

const SAMPLE_ROWS: PublishedTableRow[] = [
  {
    id: "NSAA:2022:Section 1:Section 1A",
    exam: "NSAA",
    year: 2022,
    sectionPaper: "Section 1",
    subjects: "Mathematics",
    paperName: "Section 1",
    partName: "Section 1A",
    tableId: 11,
    csvFilename: "nsaa-2022-section-1-section-1a-conversion.csv",
    pdfFilename: "nsaa-2022-section-1-section-1a-conversion.pdf",
    rowCount: 21,
    confidence: "high",
    formatType: "standard_mcq",
  },
  {
    id: "ENGAA:2023:Section 1:Section 1A",
    exam: "ENGAA",
    year: 2023,
    sectionPaper: "Section 1",
    subjects: "Maths & Physics",
    paperName: "Section 1",
    partName: "Section 1A",
    tableId: 29,
    csvFilename: "engaa-2023-section-1-section-1a-conversion.csv",
    pdfFilename: "engaa-2023-section-1-section-1a-conversion.pdf",
    rowCount: 40,
    confidence: "high",
    formatType: "standard_mcq",
  },
];

function client(props: {
  rows?: PublishedTableRow[];
  defaultOpen?: boolean;
  examFilter?: "NSAA" | "ENGAA" | "TMUA";
  defaultExam?: "NSAA" | "ENGAA" | "TMUA" | "all";
}) {
  return createElement(PublishedConversionTablesClient, props);
}

function mount(ui: ReactElement): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, root };
}

describe("PublishedConversionTablesClient SSR / crawler HTML", () => {
  it("includes real conversion-table rows in initial markup when supplied", () => {
    const html = renderToStaticMarkup(
      client({ rows: SAMPLE_ROWS, defaultOpen: true }),
    );

    expect(html).toContain("Official score conversion tables");
    expect(html).toContain("2022");
    expect(html).toContain("NSAA");
    expect(html).toContain("Mathematics");
    expect(html).toContain("2023");
    expect(html).toContain("ENGAA");
    expect(html).not.toContain("No tables match these filters.");
    expect(html).not.toContain("Failed to load conversion tables");
    expect(html).not.toContain("Loading tables");
  });

  it("does not show empty-filter copy when preloaded rows exist", () => {
    const html = renderToStaticMarkup(
      client({
        rows: SAMPLE_ROWS,
        defaultOpen: true,
        examFilter: "NSAA",
        defaultExam: "NSAA",
      }),
    );

    expect(html).toContain("Mathematics");
    expect(html).not.toContain("No tables match these filters.");
  });
});

describe("PublishedConversionTablesClient catalog fetch", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("does not call the published-catalog API when rows are preloaded", async () => {
    const { root, container } = mount(
      client({ rows: SAMPLE_ROWS, defaultOpen: true }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Mathematics");
    expect(container.textContent).not.toContain(
      "Failed to load conversion tables",
    );

    act(() => {
      root.unmount();
    });
  });

  it("keeps SSR rows when a later client catalog fetch fails", async () => {
    let rejectFetch: (reason?: unknown) => void = () => {};
    const pending = new Promise<Response>((_resolve, reject) => {
      rejectFetch = reject;
    });
    fetchMock.mockReturnValue(pending);

    const { root, container } = mount(client({ defaultOpen: true }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/score-converter/published-catalog"),
    );

    // SSR/preloaded rows arrive while the client request is still pending.
    act(() => {
      root.render(client({ rows: SAMPLE_ROWS, defaultOpen: true }));
    });

    expect(container.textContent).toContain("Mathematics");
    expect(container.textContent).not.toContain("Loading tables");

    await act(async () => {
      rejectFetch(new Error("Failed to load conversion tables"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Mathematics");
    expect(container.textContent).toContain("2022");
    expect(container.textContent).not.toContain(
      "Failed to load conversion tables",
    );
    expect(container.textContent).not.toContain(
      "No tables match these filters.",
    );

    act(() => {
      root.unmount();
    });
  });

  it("shows the load error only when there are no rows to keep", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "down" }),
    });

    const { root, container } = mount(client({ defaultOpen: true }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Failed to load conversion tables");
    expect(container.textContent).not.toContain("Mathematics");

    act(() => {
      root.unmount();
    });
  });
});
