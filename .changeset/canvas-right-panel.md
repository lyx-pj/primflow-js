---
"@lyx-pj/primflow-canvas": minor
---

Replace the node panel's selection-driven opening with a toolbar toggle and add Node / Global settings tabs. The panel is open by default; `nodePanel.open: false` starts it closed. The Node tab shows a single selected node or a graph overview when no single node is selected; the overview lists every node in the current view and centers/selects a node when clicked. Applications can provide `overview` and `globalSettings` renderers; the overview renderer receives a `locateNode` callback. Control the panel with `openNodePanel`, `closeNodePanel`, `toggleNodePanel`, `isNodePanelOpen`, and `refreshNodePanel`. The debug panel toggle now uses a console icon, and the toolbar is shown by default while the node panel is enabled.
