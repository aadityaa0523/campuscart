import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { useTheme, radii } from "../theme/tokens";

export function Skeleton({ width = "100%", height = 16 }: { width?: number | `${number}%`; height?: number }) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, easing: Easing.ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, borderRadius: radii.sm, backgroundColor: theme.border, opacity }}
    />
  );
}
