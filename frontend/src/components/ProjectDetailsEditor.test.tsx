import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectDetailsEditor } from "@/components/ProjectDetailsEditor";
import { initialData } from "@/lib/kanban";

describe("ProjectDetailsEditor", () => {
  it("edits and saves project name and description", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<ProjectDetailsEditor project={initialData.project} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: "Edit project details" }));
    await user.clear(screen.getByLabelText("Project name"));
    await user.type(screen.getByLabelText("Project name"), "Customer insights");
    await user.clear(screen.getByLabelText("Project description"));
    await user.type(
      screen.getByLabelText("Project description"),
      "Turn customer feedback into product improvements."
    );
    await user.click(screen.getByRole("button", { name: "Save project details" }));

    expect(onSave).toHaveBeenCalledWith({
      name: "Customer insights",
      description: "Turn customer feedback into product improvements.",
    });
  });
});
