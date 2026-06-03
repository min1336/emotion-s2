import { useLayoutEffect } from "react";

type KeyboardInputCandidate = {
  isContentEditable?: boolean;
  tagName?: string;
};

export function isKeyboardInputElement(element: KeyboardInputCandidate | null | undefined) {
  if (!element) {
    return false;
  }

  const tagName = element.tagName?.toLowerCase();
  return tagName === "input" || tagName === "textarea" || Boolean(element.isContentEditable);
}

function isKeyboardInputActive() {
  return isKeyboardInputElement(document.activeElement);
}

let appViewportBaselineHeight = 0;

export function updateAppViewportMetrics() {
  const visualViewport = window.visualViewport;
  const visualHeight = Math.round(visualViewport?.height || window.innerHeight);
  const visualOffsetTop = Math.max(0, Math.round(visualViewport?.offsetTop || 0));
  const visualBottom = visualHeight + visualOffsetTop;
  const layoutHeight = Math.round(window.innerHeight);
  const candidateHeight = Math.max(visualBottom, layoutHeight);
  const inputActive = isKeyboardInputActive();

  if (!appViewportBaselineHeight || (!inputActive && candidateHeight > appViewportBaselineHeight - 24)) {
    appViewportBaselineHeight = candidateHeight;
  }

  const baselineKeyboardInset = Math.max(0, appViewportBaselineHeight - visualBottom);
  const directKeyboardInset = Math.max(0, layoutHeight - visualHeight - visualOffsetTop);
  const keyboardInset = inputActive ? Math.max(baselineKeyboardInset, directKeyboardInset) : 0;
  const isKeyboardOpen = keyboardInset > 80;
  const viewportHeight = isKeyboardOpen ? appViewportBaselineHeight : candidateHeight;

  if (viewportHeight > 0) {
    document.documentElement.style.setProperty("--app-viewport-height", `${viewportHeight}px`);
  }

  document.documentElement.style.setProperty("--keyboard-inset", `${isKeyboardOpen ? keyboardInset : 0}px`);
  document.documentElement.classList.toggle("keyboard-open", isKeyboardOpen);
  document.body.classList.toggle("keyboard-open", isKeyboardOpen);
}

export function useAppViewportHeight(refreshKey: string) {
  useLayoutEffect(() => {
    const timers = new Set<number>();
    let animationFrame = 0;

    const refresh = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        updateAppViewportMetrics();
      });
    };
    const settle = () => {
      refresh();
      [80, 240, 520, 900].forEach((delay) => {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          refresh();
        }, delay);
        timers.add(timer);
      });
    };

    settle();
    window.addEventListener("resize", settle);
    window.addEventListener("orientationchange", settle);
    window.addEventListener("focus", settle, true);
    window.addEventListener("blur", settle, true);
    document.addEventListener("focusin", settle);
    document.addEventListener("focusout", settle);
    document.addEventListener("visibilitychange", settle);
    window.visualViewport?.addEventListener("resize", settle);
    window.visualViewport?.addEventListener("scroll", settle);

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", settle);
      window.removeEventListener("orientationchange", settle);
      window.removeEventListener("focus", settle, true);
      window.removeEventListener("blur", settle, true);
      document.removeEventListener("focusin", settle);
      document.removeEventListener("focusout", settle);
      document.removeEventListener("visibilitychange", settle);
      window.visualViewport?.removeEventListener("resize", settle);
      window.visualViewport?.removeEventListener("scroll", settle);
    };
  }, []);

  useLayoutEffect(() => {
    updateAppViewportMetrics();
    const firstFrame = window.requestAnimationFrame(updateAppViewportMetrics);
    const timer = window.setTimeout(updateAppViewportMetrics, 180);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearTimeout(timer);
    };
  }, [refreshKey]);
}
