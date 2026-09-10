import { Text, View } from "react-native";
import { formatPaise } from "../api/money";
import { useTheme, radii, spacing, type } from "../theme/tokens";

export function ThresholdBar({ totalPaise, thresholdPaise }: { totalPaise: number; thresholdPaise: number }) {
  const theme = useTheme();
  const ratio = Math.min(1, totalPaise / thresholdPaise);
  const reached = totalPaise >= thresholdPaise;
  const label = reached
    ? `Minimum order reached: ${formatPaise(totalPaise)} of ${formatPaise(thresholdPaise)}`
    : `${formatPaise(totalPaise)} of ${formatPaise(thresholdPaise)}, ${formatPaise(thresholdPaise - totalPaise)} to go`;

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}>
      <View style={{ height: 12, backgroundColor: theme.track, borderRadius: radii.pill, overflow: "hidden" }}>
        <View style={{ height: 12, width: `${ratio * 100}%`, backgroundColor: reached ? theme.success : theme.primary, borderRadius: radii.pill }} />
      </View>
      {/* Text label carries the same info as color/fill — never color alone (spec §9 a11y). */}
      <Text style={{ marginTop: spacing.xs, color: reached ? theme.success : theme.textMuted, ...type.label }}>
        {reached ? `✓ Minimum order reached — ${formatPaise(totalPaise)}` : label}
      </Text>
    </View>
  );
}
