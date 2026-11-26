---
"@lyx-pj/primflow-canvas": patch
---

Keep application-provided port editors mounted when a port value changes, and update the node instance before the joint model so value-dependent node renderers re-render with the new value. Custom port controls no longer disappear after a value update, including asset selections made in the node panel.
