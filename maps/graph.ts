/**
 * File: graph.ts
 * Purpose: Specify the Graph data structure for the map and load the data
 * Author: C. Cooper
 * Date Created: 2026-02-07
 * Date Modified: 2026-02-07
 */
import { getEdges, getNodes } from "./data"

/**
 * An edge (path) in the graph
 */
export interface Edge
{
    /** A unique id for the edge */
    id: number,
    /** The first node the edge connects. Should be the lower node if this is a staircase. */
    startNode: Node,
    /** The other node the edge connects. Should be the upper node if this is a staircase. */
    endNode: Node,
    /** The length of the edge. Ignored if outdoors. */
    length: number
    /** The type of path the edge represents, such as "stairs" or "sidewalk". */
    type: string
    /** Whether the edge is accessible. */
    accessible: boolean
    /** Whether the edge is indoors. */
    indoors: boolean
}

/**
 * A node (location) in the graph
 */
export interface Node
{
    /** A unique id for the node */
    id: number,
    /** The name of the node. Should begin with a tilde (~) if the node is not a possible routing destination. */
    name: string,
    /** The x-coordinate of the node (longitude if outdoors) */
    x: number,
    /** The y-coordinate of the node (latitude if outdoors) */
    y: number,
    /** The Node for the building the node is in. undefined if the node is outdoors. */
    building: Node | undefined,
    /** All of the edges with this node as one of their ends. */
    edges: Edge[]
}

/**
 * A graph representing the walking paths and destinations on campus
 */
export interface Graph
{
    /** The edges (paths) in the graph */
    edges: Edge[]

    /** The nodes (destinations) in the graph */
    nodes: Node[]
}

/**
 * The graph representing the walking paths and destinations on campus
 */
export const graph = loadGraph();

/**
 * Loads the Graph data structure from the data json files
 * @returns The Graph of the paths on campus
 */
function loadGraph(): Graph
{
    // Load the edges and nodes from the json files
    const edgeData = getEdges();
    const nodeData = getNodes();

    const edges: Edge[] = [];
    const nodes: Node[] = [];

    // Unique id -> Edge/Node object maps
    const edgeMap: Map<number, Edge> = new Map();
    const nodeMap: Map<number, Node> = new Map();

    // Parse the NodeData objects into Node objects, but without the edges field filled out (will be filled out after the Edge objects are created)
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

        // Add the node object to the node map
        nodeMap.set(node.id, node);
    }

    // Parse the EdgeData objects into Edge objects
    for(const data of edgeData)
    {
        // Get the Node objects corresponding with the start and end node ids
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

        // Add the edge object to the edge map
        edgeMap.set(edge.id, edge);
    }

    // Go back and fill in the edges field for the Nodes
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

    // Return the Graph
    return {
        edges: edges,
        nodes: nodes
    };
}