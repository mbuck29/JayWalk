/**
 * File: routingUtils.ts
 * Purpose: Utilility functions for the routing algorithm and Route objects
 * Author: C. Cooper
 * Date Created: 2026-02-11
 */

import { Edge, Node } from "@/maps/graph";
import { Route } from "./routing";

/**
 * Creates a string representation of the given route.
 * Form: [Stop 0] -> [Stop 1] -> ... -> [Stop N]
 * @param route The route to stringify.
 * @returns A string represention of the route.
 */
export function stringifyRoute(route: Route): string
{
    if(route.stops.length == 1)
    {
        return route.stops[0].name;
    }

    let out = "";

    for(let i = 0; i < route.stops.length; i++)
    {
        out += route.stops[i].name;

        if(i != route.stops.length - 1)
        {
            out += " -> ";
        }
    }

    return out;
}

/**
 * Checks whether the given edge has the given node as one of its ends
 * @param edge The edge to check
 * @param node The node to check for
 * @returns True if the given node is one of the given ends of the edge.
 */
export function edgeHas(edge: Edge, node: Node): boolean
{
    return edge.startNode.id == node.id || edge.endNode.id == node.id;
}

/**
 * Given a node on the given edge, returns the other node on the edge
 * @param edge The edge connecting the nodes
 * @param known The node that is known to be on the edge
 * @returns The other node on the edge
 */
export function edgeOther(edge: Edge, known: Node): Node
{
    return edge.startNode.id === known.id ? edge.endNode : edge.startNode;
}

/**
 * Creates a sanitized copy of the given Route for storage in the global state by shallow-copying the Edge and Node objects without recursive references
 * @param route The route to sanitize
 * @returns A sanitized copy of the given Route without recursive references
 */
export function sanitize(route: Route): Route
{
    // Sanitize the edges
    const sanitizedEdges = [];
    for(const edge of route.route)
    {
        // Create a copy of the edge except that the nodes don't point to their edges so that there isn't any recursion
        const newEdge: Edge = {
            ...edge,
            startNode: {
            ...edge.startNode,
            edges: []
            },
            endNode: {
            ...edge.endNode,
            edges: []
            }
        }

        sanitizedEdges.push(newEdge);
    }

    // Sanitize the nodes
    const sanitizedStops = [];
    for(const stop of route.stops)
    {
        const newStop: Node = {
            ...stop,
            edges: []
        }

        sanitizedStops.push(newStop);
    }

    return {
        route: sanitizedEdges,
        stops: sanitizedStops
    }
}