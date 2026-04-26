/**
 * File: RoutePolyline
 * Purpose: Draw the path for a given route
 * Author: C. Cooper, Delaney G
 * Date Created: 2026-04-16
 * Date Modified: 2026-04-16
 */
import { Route } from "@/app/Utils/routing";
import { Node } from "@/maps/graph";
import { Polyline } from "react-native-maps";

interface RoutePolylineProps
{
    route: Route,
    currentNodeIndex: number;
}

function makeRoutePolyline(stops: Node[], currentNode: number, baseIndex: number,) 
{
    if(!stops || stops.length < 2) return null; // return if route too short

    const splitAt = Math.max(
        0,
        Math.min(currentNode - baseIndex, stops.length - 1),
    );
    const traveled = stops.slice(0, splitAt + 1);
    const remaining = stops.slice(splitAt);

    const toCoords = (nodes: Node[]) =>
        nodes.map((node) => ({ latitude: node.y, longitude: node.x }));

    const out = [];

    if(traveled.length >= 2)
    {
        out.push(
            <Polyline
                coordinates={toCoords(traveled)}
                strokeColor="#9ca3af"
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
                key={stops[0].name + "-traveled"}
            />
        );
    }
    if(remaining.length >= 2)
    {
        out.push(
            <Polyline
                coordinates={toCoords(remaining)}
                strokeColor="#0066ff"
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
                key={stops[0].name + "-remaining"}
            />
        );
    }

    //displays route
    return out;
}

export default function RoutePolyline({ route, currentNodeIndex }: RoutePolylineProps) 
{
    const polylines = [];

    let base = 0;

    for(let i = 1; i < route.stops.length; i++) 
    {
        if(!route.route[i - 1].indoors) 
        {
            if(base < 0) 
            {
                base = i - 1;
            }

            continue;
        }

        if(base != i - 1) 
        {
            polylines.push((route.stops.slice(base, i), currentNodeIndex, base));
        }

        base = -1;
    }

    if(base >= 0 && base != route.stops.length - 2) 
    {
        polylines.concat(makeRoutePolyline(route.stops.slice(base, route.stops.length), currentNodeIndex, base));
    }

    return polylines.length > 0 ? polylines : null;
}