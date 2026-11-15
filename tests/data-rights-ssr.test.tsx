// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { AccountDeletionPanel, DataExportPanel } from "../src";
import { ERASURE_EXECUTED, ERASURE_PENDING, READY } from "./data-rights-fixtures";

describe("server rendering of the data-rights panels", () => {
  it("renders both panels where there is no document", () => {
    expect(typeof document).toBe("undefined");

    const html = renderToString(
      <>
        <DataExportPanel exports={[READY]} formats={["json", "zip"]} limits={{ perDay: 3, remainingToday: 1 }} />
        <AccountDeletionPanel erasure={ERASURE_PENDING} graceDays={30} now="2026-11-20T09:30:00Z" />
        <AccountDeletionPanel erasure={ERASURE_EXECUTED} graceDays={0} />
        <AccountDeletionPanel erasure={null} graceDays={30} />
      </>,
    );

    expect(html).toContain('data-fancy-compliance="data-export"');
    expect(html).toContain('data-erasure-status="pending"');
    expect(html).toContain('data-erasure-retained="council_events"');
  });
});
