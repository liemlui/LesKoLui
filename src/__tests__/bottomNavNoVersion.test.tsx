import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BottomNav from "../components/BottomNav";
import { APP_VERSION } from "../lib/version";

describe("BottomNav", () => {
  it("does not render the app version in the nav strip", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(html).toContain("Home");
    expect(html).toContain("Keuangan");
    expect(html).not.toContain(APP_VERSION);
  });
});
