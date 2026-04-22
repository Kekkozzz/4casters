import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Btn, Pill, Card, SourceChip } from "@/components/ui/primitives";

describe("Btn", () => {
  it("renders children", () => {
    render(<Btn>Generate</Btn>);
    expect(screen.getByRole("button", { name: "Generate" })).toBeInTheDocument();
  });

  it("applies primary variant classes", () => {
    render(<Btn variant="primary">Go</Btn>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-accent");
  });

  it("applies size classes", () => {
    render(<Btn size="lg">Big</Btn>);
    expect(screen.getByRole("button").className).toContain("h-10");
  });

  it("forwards arbitrary props (disabled)", () => {
    render(<Btn disabled>Nope</Btn>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("Pill", () => {
  it("renders children", () => {
    render(<Pill>QF</Pill>);
    expect(screen.getByText("QF")).toBeInTheDocument();
  });

  it("applies accent tone when requested", () => {
    render(<Pill tone="accent">Grand Final</Pill>);
    expect(screen.getByText("Grand Final").className).toContain("text-[#9AB4E8]");
  });
});

describe("Card", () => {
  it("renders children inside a card-radius container", () => {
    render(<Card>hello</Card>);
    expect(screen.getByText("hello").className).toContain("rounded-card");
  });

  it("adds hover classes when hoverable", () => {
    render(<Card hoverable>hover me</Card>);
    expect(screen.getByText("hover me").className).toContain("hover:border-line2");
  });
});

describe("SourceChip", () => {
  it("renders a new-tab anchor with noopener", () => {
    render(
      <SourceChip url="https://liquipedia.net/rocketleague/Halcyon">
        liquipedia.net/rocketleague/Halcyon
      </SourceChip>,
    );
    const a = screen.getByRole("link");
    expect(a).toHaveAttribute("href", "https://liquipedia.net/rocketleague/Halcyon");
    expect(a).toHaveAttribute("target", "_blank");
    expect(a).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("falls back to url text when no children", () => {
    render(<SourceChip url="https://blast.tv/rocket-league/stats" />);
    expect(screen.getByText("https://blast.tv/rocket-league/stats")).toBeInTheDocument();
  });
});
