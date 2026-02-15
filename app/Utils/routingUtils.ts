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
export function stringifyRoute(route: Route): string {
  if (route.stops.length == 1) {
    return route.stops[0].name;
  }

  let out = "";

  for (let i = 0; i < route.stops.length; i++) {
    out += route.stops[i].name;

    if (i != route.stops.length - 1) {
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
export function edgeHas(edge: Edge, node: Node): boolean {
  return edge.startNode.id == node.id || edge.endNode.id == node.id;
}

/**
 * Given a node on the given edge, returns the other node on the edge
 * @param edge The edge connecting the nodes
 * @param known The node that is known to be on the edge
 * @returns The other node on the edge
 */
export function edgeOther(edge: Edge, known: Node): Node {
  return edge.startNode.id === known.id ? edge.endNode : edge.startNode;
}

/**
 * Creates a sanitized copy of the given Route for storage in the global state by shallow-copying the Edge and Node objects without recursive references
 * @param route The route to sanitize
 * @returns A sanitized copy of the given Route without recursive references
 */
export function sanitize(route: Route): Route {
  // Sanitize the edges
  const sanitizedEdges = [];
  for (const edge of route.route) {
    // Create a copy of the edge except that the nodes don't point to their edges so that there isn't any recursion
    const newEdge: Edge = {
      ...edge,
      startNode: {
        ...edge.startNode,
        edges: [],
      },
      endNode: {
        ...edge.endNode,
        edges: [],
      },
    };

    sanitizedEdges.push(newEdge);
  }

  // Sanitize the nodes
  const sanitizedStops = [];
  for (const stop of route.stops) {
    const newStop: Node = {
      ...stop,
      edges: [],
    };

    sanitizedStops.push(newStop);
  }

  return {
    route: sanitizedEdges,
    stops: sanitizedStops,
  };
}

/**
 * Calculates the distance in meters between two points given their latitude and longitude using the Haversine formula.
 * This treats Earth like a sphere and returns the shortest distance over its surface.
 * @param lat1 The latitude of the first point
 * @param lon1 The longitude of the first point
 * @param lat2 The latitude of the second point
 * @param lon2 The longitude of the second point
 * @return The distance in meters between the two points
 */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371000; // Earth’s radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180; // Convert degrees to radians

  // Trig functions use radians, but GPS coords come in degrees. So here we convert the lat and long diff to radians
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  // 1st term is for the latitude difference, meaning the difference in north/south position.
  const term1 = Math.sin(dLat / 2) ** 2;

  // 2nd term is for the longitude difference, meaning the difference in east/west position. But longitude lines get closer together
  // as you go towards the poles, so we have to multiply by the cosine of the latitudes to get the actual east/west distance.
  const term2 = Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;

  // The Haversine formula combines these two terms to get the total distance between the points, accounting for the curvature of the Earth.
  const a = term1 + term2;

  // Finally, we convert this to a distance in meters by multiplying by the Earth’s radius and applying the arcsine function to get the angle between the points,
  // which gives us the distance along the surface of the Earth.
  return 2 * R * Math.asin(Math.sqrt(a));
}
