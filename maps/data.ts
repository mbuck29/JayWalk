/**
 * File: data.ts
 * Purpose: Specify the data storage format for the app and load the raw data
 * Author: C. Cooper
 * Date Created: 2026-02-07
 * Date Modified: 2026-02-07
 */

/**
 * An edge (path) in the graph
 */
export interface DataEdge
{
    /** A unique id for the edge */
    id: number,
    /** The id for the first node the edge connects. Should be the lower node if this is a staircase. */
    startNodeId: number,
    /** The id for the other node the edge connects. Should be the upper node if this is a staircase. */
    endNodeId: number,
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
export interface DataNode
{
    /** A unique id for the node */
    id: number,
    /** The name of the node. Should begin with a tilde (~) if the node is not a possible routing destination. */
    name: string,
    /** The x-coordinate of the node (longitude if outdoors) */
    x: number,
    /** The y-coordinate of the node (latitude if outdoors) */
    y: number,
    /** The node id of the building the node is in. -1 if the node is outdoors. */
    buildingId: number,
    floor: number | undefined,
    /** The unique ids for all of the edges with this node as one of their ends. */
    edgeIds: number[]
}

/**
 * Loads the edge data
 * @returns The edge data for the app's map
 */
export function getEdges()
{
    return require('./edges.json') as DataEdge[]
}

/**
 * Loads the node data
 * @returns The node data for the app's map
 */
export function getNodes()
{
    return require('./nodes.json') as DataNode[]
}