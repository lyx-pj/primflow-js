---
"@lyx-pj/primflow-canvas": minor
---

Add a JSON code editor for `array` and `object` node inputs. The node panel now renders a CodeMirror 6 editor with line numbers, JSON syntax highlighting, bracket matching, search and replace, and parse errors reported in the gutter. The editor writes the parsed value back to the node shortly after typing stops, and keeps the previous value while the document is invalid or does not match the port type. The editor follows the panel theme through the `--bpgraph-panel-*` variables. CodeMirror is now a runtime dependency of the canvas package.
