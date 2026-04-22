import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { FeedbackBar } from "@/components/ui/feedback-bar";

describe("FeedbackBar", () => {
  it("toggles thumbs up aria-pressed on click", async () => {
    const u = userEvent.setup();
    render(<FeedbackBar />);
    const up = screen.getByLabelText("helpful");
    expect(up).toHaveAttribute("aria-pressed", "false");
    await u.click(up);
    expect(up).toHaveAttribute("aria-pressed", "true");
    await u.click(up);
    expect(up).toHaveAttribute("aria-pressed", "false");
  });

  it("switches from up to down when the opposite is clicked", async () => {
    const u = userEvent.setup();
    render(<FeedbackBar />);
    await u.click(screen.getByLabelText("helpful"));
    await u.click(screen.getByLabelText("not helpful"));
    expect(screen.getByLabelText("helpful")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("not helpful")).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onChange with the new vote value", async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();
    render(<FeedbackBar onChange={onChange} />);
    await u.click(screen.getByLabelText("helpful"));
    expect(onChange).toHaveBeenLastCalledWith("up");
    await u.click(screen.getByLabelText("helpful"));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
