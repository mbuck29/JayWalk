import { getEdges, getNodes } from "./data"

export interface Edge
{
    id: number,
    startNode: Node,
    endNode: Node,
    length: number
    type: string
    accessible: boolean
    indoors: boolean
}

export interface Node
{
    id: number,
    name: string
    x: number
    y: number
    building: Node | undefined
    edges: Edge[]
}

export interface Graph
{
    edges: Edge[]
    nodes: Node[]
}

export const graph = loadGraph();

function loadGraph(): Graph
{
    const edgeData = getEdges();
    const nodeData = getNodes();

    const edges: Edge[] = [];
    const nodes: Node[] = [];

    const edgeMap: Map<number, Edge> = new Map();
    const nodeMap: Map<number, Node> = new Map();

    for(const data of nodeData)
    {
        const node: Node = {
            id: data.id,
            name: data.name,
            x: data.x,
            y: data.y,
            building: nodes.find(n => n.id == data.buildingId),
            edges: []
        };

        nodes.push(node);
        nodeMap.set(node.id, node);
    }

    for(const data of edgeData)
    {
        const startNode = nodeMap.get(data.startNodeId);
        const endNode = nodeMap.get(data.endNodeId);

        if(!(startNode && endNode))
        {
            continue;
        }

        const edge: Edge = {
            id: data.id,
            startNode: startNode,
            endNode: endNode,
            length: data.length,
            type: data.type,
            accessible: data.accessible,
            indoors: data.indoors,
        }

        edges.push(edge);
        edgeMap.set(edge.id, edge);
    }

    for(const data of nodeData)
    {
        const node = nodeMap.get(data.id);

        if(!node)
        {
            continue;
        }

        for(const id of data.edgeIds)
        {
            const edge = edgeMap.get(id);

            if(!edge)
            {
                continue;
            }

            node.edges.push(edge);
        }
    }

    return {
        edges: edges,
        nodes: nodes
    };
}