import { Edge, Node } from "@/maps/graph";
import { Route } from "./routing";

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

export function edgeHas(edge: Edge, node: Node): boolean
{
    return edge.startNode.id == node.id || edge.endNode.id == node.id;
}

export function edgeOther(edge: Edge, known: Node): Node
{
    return edge.startNode.id === known.id ? edge.endNode : edge.startNode;
}

export function sanitize(route: Route): Route
{
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