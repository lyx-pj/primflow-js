import { default as default_2 } from 'react';
import { Engine } from '@bpgraph/workflow-core/engine';
import { Graph } from '@bpgraph/workflow-core';
import { GraphOptions } from '@bpgraph/workflow-core';
import { JSX } from 'react/jsx-runtime';
import { LinkInstanceType } from '@bpgraph/workflow-core';
import { NodeClassType } from '@bpgraph/workflow-core';
import { NodeClassType as NodeClassType_2 } from '@bpgraph/workflow-core/engine';
import { NodeInstanceType } from '@bpgraph/workflow-core';
import { NodeRegistry } from '@bpgraph/workflow-core';
import { ProcessOptions } from '@bpgraph/workflow-core/engine';
import { Runtime } from '@bpgraph/workflow-core/engine';

export declare function createEngineContext<NodeDefs extends Record<string, NodeClassType_2>>(runtime: Runtime<NodeDefs>, options?: ProcessOptions): {
    EngineProvider: ({ children }: {
        children: default_2.ReactNode;
    }) => JSX.Element;
    useEngine: () => Engine<NodeDefs>;
};

export declare function createGraphContext<NodeDefs extends Record<string, NodeClassType>>(registry: NodeRegistry<NodeDefs>, options?: GraphOptions): {
    GraphProvider: ({ children }: {
        children: default_2.ReactNode;
    }) => JSX.Element;
    useGraph: () => Graph<NodeDefs>;
};

export declare function GraphView<NodeDefs extends Record<string, NodeClassType>>({ width, height, graph, className, children, options, onNodeClick, onNodeDoubleClick, onNodeSelection, onBlankClick, onBlankDoubleClick, onLinkClick, onDragStart, onDrag, onDragEnd, onStartConnecting, onKeyDown, }: GraphViewProps<NodeDefs>): JSX.Element;

declare type GraphViewProps<NodeDefs extends Record<string, NodeClassType>> = {
    graph: Graph<NodeDefs>;
    width?: number | string;
    height?: number | string;
    className?: string;
    children?: React.ReactNode;
    onNodeClick?: (node: NodeInstanceType, event: MouseEvent) => void;
    onNodeDoubleClick?: (node: NodeInstanceType, event: MouseEvent) => void;
    onNodeSelection?: (nodes: NodeInstanceType[]) => void;
    onBlankClick?: (event: MouseEvent) => void;
    onBlankDoubleClick?: (event: MouseEvent) => void;
    onLinkClick?: (link: LinkInstanceType, event: MouseEvent) => void;
    onDragStart?: (node: NodeInstanceType) => void;
    onDrag?: (node: NodeInstanceType) => void;
    onDragEnd?: (node: NodeInstanceType) => void;
    onStartConnecting?: () => void;
    onKeyDown?: (event: React.KeyboardEvent) => void;
    options?: {
        background?: string;
        gridSize?: number;
        drawGrid?: {
            size?: number;
            color?: string;
            thickness?: number;
        };
    };
};

export { }
