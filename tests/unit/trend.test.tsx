import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Trend } from "@/components/ui/trend";

describe("Trend", () => {
  it("renders an em-dash for near-zero delta", () => {
    render(<Trend delta={0} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("uses ok color on positive delta", () => {
    const { container } = render(<Trend delta={7.1} />);
    expect(container.textContent).toContain("7.1%");
    expect(container.querySelector(".text-ok")).toBeTruthy();
  });

  it("uses bad color on negative delta", () => {
    const { container } = render(<Trend delta={-2.4} />);
    expect(container.textContent).toContain("2.4%");
    expect(container.querySelector(".text-bad")).toBeTruthy();
  });

  it("renders integer deltas without trailing decimals", () => {
    const { container } = render(<Trend delta={12} />);
    expect(container.textContent).toContain("12%");
    expect(container.textContent).not.toContain("12.0%");
  });
});
