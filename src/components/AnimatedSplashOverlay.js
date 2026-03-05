import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";

import { splashAnimationConfig } from "../config/splashAnimation";

let SplashScreenModule = null;
try {
  SplashScreenModule = eval("require")("expo-splash-screen");
} catch {
  SplashScreenModule = null;
}

let LottieView = null;
try {
  LottieView = eval("require")("lottie-react-native")?.default ?? null;
} catch {
  LottieView = null;
}

const {
  durationMs,
  fadeOutMs,
  wordmarkDelayMs,
  wordmarkSlidePx,
  postCycleHoldMs,
  useLottie,
  lottieSource,
  gifSource,
} = splashAnimationConfig;

export default function AnimatedSplashOverlay({ onFinish }) {
  const [visible, setVisible] = useState(true);

  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.86)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const arcSpin = useRef(new Animated.Value(0)).current;
  const arcOpacity = useRef(new Animated.Value(0.95)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslateY = useRef(new Animated.Value(wordmarkSlidePx)).current;

  const canUseLottie = useLottie && !!LottieView && !!lottieSource;
  const canUseGif = !canUseLottie && !!gifSource;

  const spinInterpolate = useMemo(
    () =>
      arcSpin.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      }),
    [arcSpin],
  );

  useEffect(() => {
    SplashScreenModule?.preventAutoHideAsync?.().catch(() => {});

    const boot = async () => {
      await SplashScreenModule?.hideAsync?.().catch(() => {});

      Animated.parallel([
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.85,
            duration: 420,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.45,
            duration: 420,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(arcSpin, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(arcOpacity, {
          toValue: 0,
          duration: 760,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(760),
          Animated.parallel([
            Animated.timing(ringOpacity, {
              toValue: 1,
              duration: 180,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(ringScale, {
              toValue: 1,
              duration: 220,
              easing: Easing.out(Easing.back(1.1)),
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(wordmarkDelayMs),
          Animated.parallel([
            Animated.timing(wordmarkOpacity, {
              toValue: 1,
              duration: 380,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(wordmarkTranslateY, {
              toValue: 0,
              duration: 380,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();

      const cycleCompleteAtMs = 980;
      const finishAtMs = Math.max(durationMs, cycleCompleteAtMs + postCycleHoldMs);
      const doneTimer = setTimeout(() => {
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: fadeOutMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          setVisible(false);
          onFinish?.();
        });
      }, finishAtMs);

      return () => clearTimeout(doneTimer);
    };

    const cleanupPromise = boot();

    return () => {
      cleanupPromise.then((cleanup) => cleanup?.()).catch(() => {});
    };
  }, [
    arcOpacity,
    arcSpin,
    fadeOutMs,
    glowOpacity,
    onFinish,
    overlayOpacity,
    ringOpacity,
    ringScale,
    wordmarkDelayMs,
    wordmarkOpacity,
    wordmarkSlidePx,
    wordmarkTranslateY,
    postCycleHoldMs,
  ]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="auto">
      {canUseLottie ? (
        <View style={styles.assetWrap}>
          <LottieView source={lottieSource} autoPlay loop={false} style={styles.assetMedia} />
        </View>
      ) : canUseGif ? (
        <View style={styles.assetWrap}>
          <Image source={gifSource} style={styles.assetMedia} resizeMode="contain" />
        </View>
      ) : (
        <View style={styles.circleWrap}>
          <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />
          <Animated.View
            style={[
              styles.drawArc,
              {
                opacity: arcOpacity,
                transform: [{ rotate: spinInterpolate }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.mainRing,
              {
                opacity: ringOpacity,
                transform: [{ scale: ringScale }],
              },
            ]}
          />
          <Animated.Text
            style={[
              styles.wordmark,
              {
                opacity: wordmarkOpacity,
                transform: [{ translateY: wordmarkTranslateY }],
              },
            ]}
          >
            Glō
          </Animated.Text>
        </View>
      )}
    </Animated.View>
  );
}

const RING_SIZE = 188;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
    zIndex: 9999,
  },
  circleWrap: {
    width: 320,
    height: 280,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  glowRing: {
    position: "absolute",
    width: RING_SIZE + 32,
    height: RING_SIZE + 32,
    borderRadius: 999,
    borderWidth: 12,
    borderColor: "rgba(72, 143, 255, 0.32)",
  },
  drawArc: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: 999,
    borderWidth: 5,
    borderColor: "transparent",
    borderTopColor: "#cae8ff",
    borderRightColor: "#cae8ff",
  },
  mainRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: 999,
    borderWidth: 5,
    borderColor: "#cae8ff",
  },
  wordmark: {
    marginTop: 26,
    color: "#e6eaef",
    fontSize: 58,
    fontWeight: "500",
    letterSpacing: 0.6,
  },
  assetWrap: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  assetMedia: {
    width: "100%",
    height: "100%",
  },
});
