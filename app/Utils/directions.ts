import { Node } from "@/maps/graph";
import { Route } from "./routing";
import { edgeHas, edgeOther } from "./routingUtils";

const FIVE_DEGREES = 5 / 180 * Math.PI;
const TEN_DEGREES = 10 / 180 * Math.PI;
const FIFTEEN_DEGREES = 15 / 180 * Math.PI;
const FORTY_FIVE_DEGREES = 45 / 180 * Math.PI;
const NINETY_DEGREES = 90 / 180 * Math.PI;

export interface Direction
{
    node: number;
    direction: string;
    show: boolean;
    prompt: boolean;
}

export function populateDirections(route: Route)
{
    const paths = route.route;
    const stops = route.stops;

    const directions: Direction[] = route.directions;

    for(let i = 1; i < paths.length; i++)
    {
        const lastStop = stops[i - 1];
        const thisStop = stops[i];
        const nextStop = stops[i + 1];
        const edgeIn = paths[i - 1];
        const edgeOut = paths[i];

        const optionsAtThisStop = getOptions(lastStop, thisStop);

        let optionIndex = -1;
        let correctOption;

        for(let j = 0; j < optionsAtThisStop.length; j++)
        {
            const option = optionsAtThisStop[j];

            if(option.node.id == nextStop.id)
            {
                optionIndex = j;
                correctOption = option;
                break;
            }
        }

        if(!correctOption)
        {
            continue;
        }

        const optionAngle = correctOption.relativeAngle;
        const optionTurn = getTurnType(optionAngle);

        console.log(`From ${thisStop.name} to ${nextStop.name} ${optionAngle * 180 / Math.PI} ${optionTurn}`);

        let directionPrefix = getTurnAction(optionTurn);

        if(directionPrefix != "")
        {
            directionPrefix += " to ";
        }

        if(optionsAtThisStop.length == 1)
        {
            directions.push({
                node: i - 1,
                direction: directionPrefix == "" ? getRouteAction(edgeOut.type, edgeOut.startNode.id == thisStop.id) : directionPrefix + getRouteAction(edgeOut.type, edgeOut.startNode.id == thisStop.id).toLowerCase(),
                show: edgeIn.type != edgeOut.type,
                prompt: false
            });

            continue;
        }

        directions.push({
            node: i - 1,
            direction: directionPrefix == "" ? getRouteAction(edgeOut.type, edgeOut.startNode.id == thisStop.id) : directionPrefix + getRouteAction(edgeOut.type, edgeOut.startNode.id == thisStop.id).toLowerCase(),
            show: edgeIn.type != edgeOut.type,
            prompt: false
        });
    }
}

function getAngle(node1: Node, node2: Node): number
{
    let angle = Math.atan2(node1.y - node2.y, node1.x - node2.x);

    return normalizeAngle(angle);
}

function normalizeAngle(angle: number): number
{
    if(angle < -Math.PI)
    {
        return angle + 2 * Math.PI;
    }
    else if(angle > Math.PI)
    {
        return angle - 2 * Math.PI;
    }

    return angle;
}

function getRouteAction(routeType: string, forwards: boolean): string
{
    routeType = routeType.toLowerCase();

    switch(routeType)
    {
        case "stairs":
            return forwards ? "Go up the stairs" : "Go down the stairs";
        case "sidewalk":
            return "Continue along the sidewalk";
        case "hallway":
            return "Continue down the hall";
        case "crosswalk":
            return "Take the crosswalk";
        case "door":
            return "Go through the door";
        case "doorway":
            return "Go through the doorway";
    }

    return "Take the " + routeType
}

function getTurnType(angle: number)
{
    if(angle > NINETY_DEGREES + TEN_DEGREES)
    {
        return "sharp left";
    }
    else if(angle > FORTY_FIVE_DEGREES + FIVE_DEGREES)
    {
        return "left";
    }
    else if(angle > FIFTEEN_DEGREES)
    {
        return "slight left";
    }
    else if(angle > -FIFTEEN_DEGREES)
    {
        return "straight";
    }
    else if(angle > -FORTY_FIVE_DEGREES - FIVE_DEGREES)
    {
        return "slight right";
    }
    else if(angle > -NINETY_DEGREES - TEN_DEGREES)
    {
        return "right";
    }
    else
    {
        return "sharp right"
    }
}

function getTurnAction(turnType: "sharp left" | "left" | "slight left" | "straight" | "slight right" | "right" | "sharp right")
{
    switch(turnType)
    {
        case "sharp left":
            return "Make a sharp left turn";
        case "left":
            return "Turn left";
        case "slight left":
            return "Make a slight left";
        case "straight":
            return "";
        case "sharp right":
            return "Make a sharp right turn";
        case "right":
            return "Turn right";
        case "slight right":
            return "Make a slight right";
    }
}

interface Option
{
    relativeAngle: number;
    type: string;
    node: Node;
}

function getOptions(nodeIn: Node, node: Node): Option[]
{
    const baseAngle = getAngle(nodeIn, node);

    const options: Option[] = [];

    for(const edge of node.edges)
    {
        if(edgeHas(edge, nodeIn))
        {
            continue;
        }

        const otherNode = edgeOther(edge, node);

        let angle = getAngle(node, otherNode);

        angle -= baseAngle;

        angle = normalizeAngle(angle);

        options.push({
            relativeAngle: angle,
            type: edge.type,
            node: otherNode
        });
    }

    options.sort((a, b) => a.relativeAngle - b.relativeAngle);

    return options;
}