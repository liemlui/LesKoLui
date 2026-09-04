import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Modal from "../components/Modal";

describe("Modal accessibility", () => {
  it("renders a visible close button for keyboard and screen-reader users", () => {
    const html = renderToStaticMarkup(
      <Modal onClose={() => {}} ariaLabel="Tes modal">
        <div>Isi modal</div>
      </Modal>,
    );

    expect(html).toContain("aria-label=\"Tutup panel\"");
    expect(html).toContain("role=\"dialog\"");
  });
});
