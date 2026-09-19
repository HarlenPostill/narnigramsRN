---
name: feature-demo
description:
  Build a new Anicue feature-demo — the closable, looping in-app "ad" banner
  that showcases a feature (like the Watch Along Live Activity preview on the
  anime detail screen). Use when asked to add/create a demo, showcase, preview
  banner, or in-app ad for a feature, or to extend the demo system in
  src/features/demo and src/components/demo. Triggers on "feature demo",
  "showcase banner", "preview animation", "demo the … feature".
metadata:
  author: anicue
  version: '1.0.0'
---

# Anicue feature-demo

Anicue showcases a feature with a **closable, looping in-app banner** that plays
a wordless animation of the feature in action. The reference implementation is
the Watch Along Live Activity demo on the anime detail screen. This skill builds
another one in the same shape.

Read `src/features/demo/CLAUDE.md` and `src/components/CLAUDE.md` first — they
own the rules; this skill is the procedure.

## Principles (do not violate)

1. **No words.** No headline, no caption. The animation is the message. If it
   needs a sentence to be understood, it is not finished.
2. **Real controls, faked motion.** Build the scene from real Anicue components
   (`Button`, `Surface`, `Text`, `DvdCase`, …) so the demo tracks the user's
   theme and appearance. Never restyle a control to fake it. Motion a real
   control normally drives from touch is scripted through a prop instead (e.g.
   `Button`'s `pressProgress`); add such a prop to the real component if it is
   missing, documented and inert by default.
3. **Inert.** Wrap the whole animation in `pointerEvents="none"`. Nothing inside
   navigates, mutates, or gates. Only the close key is live.
4. **A demo teaches, so a dismissal expires.** Closing a demo hides it, but if
   the user then does not use the feature for over a week the dismissal is
   pruned and the demo returns to teach again (`DISMISSAL_TTL_MS` in
   `demo-store.ts`). Wire the real feature's entry point to
   `useRecordDemoFeatureUse(id)` so using it renews the dismissal and stops the
   re-nag. Only show a demo where its feature can actually be used — gate the
   container (Watch Along's `inList`).
5. **System chrome is named, not tokenised.** If you reproduce iOS/hardware
   chrome (a Lock Screen, a device rim, a wallpaper), name those few fixed
   colours in a documented local constant. Gradients still come from
   `@/design/theme` — add a helper there, never a `linear-gradient(...)` literal
   in a component.
6. **Gates:** `npx tsc --noEmit`, `npx expo lint`, `npx expo export --platform
   ios` must all pass before you are done. No `any`; kebab-case files; `@/`
   imports; `React.use` not `useContext`; `process.env.EXPO_OS` not
   `Platform.OS`; no hand-written `useMemo`/`useCallback`.

## Steps

### 1. Register the demo id
In `src/features/demo/queries.ts`, add your id to the `DemoId` union
(e.g. `'watch-along-live-activity' | 'my-new-feature'`). This is the SQLite key;
never reuse an id for different copy.

### 2. Build the animation component
Add `src/components/demo/<feature>-demo.tsx`. Use one self-restarting timeline:

```tsx
const fade = useSharedValue(0);       // whole-stage opacity, for the loop wrap
const beatA = useSharedValue(0);      // one shared value per beat, each its own curve
// …

useEffect(() => {
  let cancelled = false;
  function play() {
    if (cancelled) return;
    fade.set(0); beatA.set(0); /* reset every value while hidden */
    fade.set(withTiming(1, { duration: 200 }));            // fade the opening in
    // Hold on the opening frame before anything moves, then offset every beat
    // by that delay so the eye settles on the starting state first.
    beatA.set(withDelay(START_DELAY_MS + 400, withTiming(1, { duration: 200 })));
    // … schedule each beat with withDelay / withSequence; springs for anything
    //    physical (a sheet dropping, a card settling)
    fade.set(withDelay(START_DELAY_MS + PLAY_MS + REST_MS - WRAP_FADE_MS,
      withTiming(0, { duration: WRAP_FADE_MS }, (finished) => {
        if (finished) runOnJS(play)();                     // re-arm the loop
      })));
  }
  play();
  return () => { cancelled = true; };
}, [fade, beatA /* … */]);
```

- Open with a **600 ms hold** on the first frame (`START_DELAY_MS`) so the eye
  settles before motion starts, then aim for a **~3 s performance then a ~1 s
  rest** on the final frame; tune with `START_DELAY_MS` / `PLAY_MS` / `REST_MS`.
- Drive per-frame motion with `useAnimatedStyle` reading `sharedValue.get()`
  (not `.value`). Animate transform/opacity/width, never layout that reflows.
- Reanimated can't animate a text node — flip integers in React state (set via
  `runOnJS` from a beat callback, reset in `play()`) and pop them with a keyed
  `entering={FadeIn}`.
- Keep the reset-while-hidden discipline so the loop wrap is seamless.

### 3. Reproduce anything that can't mount in-app
Some features are SwiftUI (`src/features/widgets`) or system UI and cannot render
inside the app. Redraw them with plain RN views in their own
`src/components/demo/*.tsx`, taking optional animated shared-value props so the
demo can drive them. Name any fixed system colours locally with a comment.

### 4. Wire the banner
In `src/components/demo/demo-banner.tsx`, add a container beside
`WatchAlongDemoBanner`:

```tsx
export function <Feature>DemoBanner({ available }: { available: boolean }) {
  const { isVisible, dismiss } = useDemoBanner('<demo-id>');
  if (!available || !isVisible) return null;   // don't teach a feature this screen can't use
  return (
    <DemoBanner onClose={dismiss}>
      <View pointerEvents="none"><FeatureDemo /></View>
    </DemoBanner>
  );
}
```

Take a prop for whether the feature is usable from this screen (Watch Along's
`inList`) and bail when it is false.

### 5. Mount it, and renew the dismissal on real use
Render `<FeatureDemo…Banner available={…} />` where the feature lives (a route
in `src/app/…`). It returns `null` when hidden, so mount it bare — do not wrap
it in a padded `View` that would leave a stray gap in a `gap`-spaced parent.

In the feature's real entry point (the button/handler that uses it, e.g.
`watch-along-action.tsx`), call `useRecordDemoFeatureUse('<demo-id>')` and fire
its callback when the user uses the feature. That renews any dismissal so the
demo does not re-appear a week later for someone who already uses the feature.

### 6. Document
Update `src/features/demo/CLAUDE.md` (the pieces table) and, if you touched a
shared component or `@/design`, its docs and the relevant `CLAUDE.md`. Keep
module header comments explaining *why*.

### 7. Run the gates
`npx tsc --noEmit && npx expo lint && npx expo export --platform ios`.

## Checklist
- [ ] New `DemoId`, unique, never reused
- [ ] Wordless, real components, `pointerEvents="none"`
- [ ] Self-restarting timeline, 600 ms hold + ~3 s play + ~1 s rest, seamless wrap
- [ ] Any non-mountable UI redrawn with animated props
- [ ] Container gated on feature availability + mounted on the target screen, returns `null` when hidden
- [ ] Real feature entry point renews the dismissal via `useRecordDemoFeatureUse`
- [ ] Docs updated; three gates green
