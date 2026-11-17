import { fireEvent, render, screen, within } from "@testing-library/react";
import { OnScreenKeyboard } from "./OnScreenKeyboard";

describe("OnScreenKeyboard", () => {
  it("renders a QWERTY layout and sends letter keys to onKey", () => {
    const onKey = jest.fn();
    render(
      <OnScreenKeyboard
        onKey={onKey}
        onBackspace={jest.fn()}
        onClear={jest.fn()}
      />,
    );

    const keyboard = within(screen.getByRole("group", { name: "On-screen keyboard" }));
    expect(keyboard.getAllByRole("button")).toHaveLength(29);

    fireEvent.click(keyboard.getByRole("button", { name: "A" }));

    expect(onKey).toHaveBeenCalledWith("a");
  });

  it("sends a space key and invokes backspace and clear independently", () => {
    const onKey = jest.fn();
    const onBackspace = jest.fn();
    const onClear = jest.fn();
    render(
      <OnScreenKeyboard
        onKey={onKey}
        onBackspace={onBackspace}
        onClear={onClear}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Space" }));
    fireEvent.click(screen.getByRole("button", { name: "Backspace" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(onKey).toHaveBeenCalledWith(" ");
    expect(onBackspace).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
