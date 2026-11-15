// jsdom lacks SVGAngle, which JointJS Vectorizer uses to detect SVG support.
// Without this property, `V()` is replaced with a function that throws.
if (typeof window !== 'undefined' && !('SVGAngle' in window)) {
  Object.defineProperty(window, 'SVGAngle', { value: class SVGAngle {}, configurable: true })
}
