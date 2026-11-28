# Subgraph parameters

English | [简体中文](subgraphs.zh-CN.md)

Ordinary subgraphs receive parameters through `Start` and return results through `End`. A subgraph node in the parent graph invokes them. See [model subgraph data and ports](../../primflow-model/docs/subgraphs.md) for JSON structure and `Start` port rules. Loop bodies follow the separate [Loop execution](loops.md) rules.

## Passing parameters and results

| Location | Role |
| --- | --- |
| Subgraph node in the parent graph | Input ports receive parameters; output ports expose returned values |
| Subgraph `Start` | Receives parameters and passes them to internal nodes through outputs with matching names |
| Subgraph `End` | Receives internal results and returns them to the parent graph |

The engine pairs ports by name. For example, if both the parent node and `Start` have a data input named `text`, the parent's `text` is passed into the subgraph. After name matching, if each side has exactly one remaining data port, those ports can be paired even when their names differ.

Pairing also follows these rules:

- Assign a value only when types match or either side is `any`.
- Skip `undefined` values unless the target type is `any`.
- `exec` and `spacer` do not carry parameters.
- Unmatched parameters are skipped without interrupting execution.

Results from the subgraph's `End` are written to the parent subgraph node's outputs before downstream parent nodes execute.

## Calls inside loop bodies

Ordinary subgraphs called from loop bodies use the same parameter rules, and their data remains isolated within the current iteration. Loop bodies enter through `LoopEntry`, not `Start`; loop entries do not participate in parameter pairing.

## Application responsibilities

The engine does not read browser storage; it accepts a complete, prepared graph. Before execution, the application must load all referenced standalone subgraph files, including files referenced inside subgraphs. Missing files or circular references must block startup in the application.

The storage structure of standalone subgraphs differs from the engine's embedded execution graph. The application must not write recursively assembled runtime graphs back to source files. See [canvas subgraphs and navigation](../../primflow-canvas/docs/subgraphs.md) for entering and returning.

## Limitations

Parameter ports are configured through node `inputs` / `outputs`; there is no visual port editor. Mismatched parameters are skipped without a dedicated UI error message.
