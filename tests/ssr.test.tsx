// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { ConsentBanner, ConsentProvider, useConsentController } from "../src";
import { snapshot } from "./helpers";

describe("server rendering", () => {
  it("renders the banner, with reserveSpace, where there is no document", () => {
    expect(typeof document).toBe("undefined");

    const html = renderToString(
      <ConsentProvider value={snapshot()} onDecide={vi.fn()} onWithdraw={vi.fn()}>
        <ConsentBanner reserveSpace />
        <ConsentBanner variant="corner" position="top-end" reserveSpace />
      </ConsentProvider>,
    );

    expect(html).toContain('data-fancy-compliance="banner"');
  });

  it("renders a controller with no props on the server without throwing", () => {
    function Probe() {
      const consent = useConsentController(undefined);
      return (
        <ConsentProvider {...consent}>
          <ConsentBanner />
        </ConsentProvider>
      );
    }
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(renderToString(<Probe />)).not.toContain('data-fancy-compliance="banner"');
  });
});
