import { render } from "@testing-library/react-native";
import { ThresholdBar } from "../ThresholdBar";

describe("ThresholdBar", () => {
  it("shows how much more is needed before the threshold", async () => {
    const { getByText } = await render(<ThresholdBar totalPaise={14500} thresholdPaise={20000} />);
    expect(getByText(/₹145 of ₹200, ₹55 to go/)).toBeTruthy();
  });

  it("announces the threshold as reached once total meets it", async () => {
    const { getByText } = await render(<ThresholdBar totalPaise={21000} thresholdPaise={20000} />);
    expect(getByText(/Minimum order reached/)).toBeTruthy();
  });

  it("exposes progress to screen readers via accessibilityValue, not color alone", async () => {
    const { getByRole } = await render(<ThresholdBar totalPaise={10000} thresholdPaise={20000} />);
    const bar = getByRole("progressbar");
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 50 });
  });
});
