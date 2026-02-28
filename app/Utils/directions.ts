import { RouteType } from "@/maps/data";
import { Node } from "@/maps/graph";
import { getDistanceMeters, Route } from "./routing";
import { edgeHas, edgeOther } from "./routingUtils";

type TurnType = "sharp left" | "left" | "slight left" | "straight" | "slight right" | "right" | "sharp right";
type IntersectionType = "intersection" | "T" | "fork" | "branch" | ""

const FIVE_DEGREES = 5 / 180 * Math.PI;
const TEN_DEGREES = 10 / 180 * Math.PI;
const FIFTEEN_DEGREES = 15 / 180 * Math.PI;
const THIRTY_DEGREES = 30 / 180 * Math.PI;
const FORTY_FIVE_DEGREES = 45 / 180 * Math.PI;
const NINETY_DEGREES = 90 / 180 * Math.PI;
const ONE_HUNDRED_EIGHTY_DEGREES = 180 / 180 * Math.PI;

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

    if(stops.length < 2)
    {
        return;
    }

    const directions: Direction[] = route.directions;

    let continueFrom: Node | null = stops[0];
    let continueType: RouteType = paths[0].type;

    for(let i = 1; i < paths.length; i++)
    {
        const lastStop = stops[i - 1];
        const thisStop = stops[i];
        const nextStop = stops[i + 1];
        const edgeIn = paths[i - 1];
        const edgeOut = paths[i];

        if(edgeOut.indoors)
        {
            const skipTo = populateDirectionsIndoors(route, i, !edgeIn.indoors);
            i = skipTo - 1;
            continue;
        }

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

        if(continueFrom && (optionTurn == "straight" || optionsAtThisStop.length == 0) && correctOption.type == continueType)
        {
            continue;
        }

        if(continueFrom && (continueFrom.id != lastStop.id || i == 1))
        {
            directions.push({
                node: i - 1,
                direction: getRouteAction("straight", continueType, edgeIn.endNode.id == thisStop.id) + ` for ${getTensOfFeetOutdoors(continueFrom, thisStop)} feet`,
                show: true,
                prompt: false
            });

            continueFrom = null;
            continueType = "elevator";
        }

        if(optionsAtThisStop.length == 1)
        {
            directions.push({
                node: i - 1,
                direction: getRouteAction(optionTurn, correctOption.type, edgeOut.startNode.id == thisStop.id),
                show: edgeIn.type != edgeOut.type,
                prompt: false
            });

            continueFrom = thisStop;
            continueType = edgeOut.type;

            continue;
        }

        const intersection = true ? "" : getIntersectionType(optionsAtThisStop);

        if(optionsAtThisStop.length == 2)
        {
            const couldBeConfused = Math.abs(optionsAtThisStop[0].relativeAngle - optionsAtThisStop[1].relativeAngle) < THIRTY_DEGREES + FIVE_DEGREES;

            if(!couldBeConfused)
            {
                directions.push({
                    node: i - 1,
                    direction: getRouteAction(optionTurn, correctOption.type, edgeOut.startNode.id == thisStop.id, intersection),
                    show: true,
                    prompt: false
                });

                continueFrom = thisStop;
                continueType = edgeOut.type;

                continue;
            }

            if(optionsAtThisStop[0].type != optionsAtThisStop[1].type)
            {
                directions.push({
                    node: i - 1,
                    direction: getRouteAction(optionTurn, correctOption.type, edgeOut.startNode.id == thisStop.id, intersection),
                    show: true,
                    prompt: false
                });

                continueFrom = thisStop;
                continueType = edgeOut.type;

                continue;
            }

            const leftIsCorrect = optionIndex == 0;

            directions.push({
                    node: i - 1,
                    direction: getRouteAction(optionTurn, correctOption.type, edgeOut.startNode.id == thisStop.id, intersection, leftIsCorrect ? "left" : "right"),
                    show: true,
                    prompt: false
                });

            continueFrom = thisStop;
            continueType = edgeOut.type;

            continue;
        }

        let closest = 100;

        if(optionIndex > 0)
        {
            closest = Math.min(closest, Math.abs(correctOption.relativeAngle - optionsAtThisStop[optionIndex - 1].relativeAngle));
        }

        if(optionIndex < optionsAtThisStop.length - 1)
        {
            closest = Math.min(closest, Math.abs(correctOption.relativeAngle - optionsAtThisStop[optionIndex + 1].relativeAngle));
        }

        let duiplicateCount = -1;

        for(const option of optionsAtThisStop)
        {
            if(option.type == correctOption.type)
            {
                duiplicateCount++;
            }
        }

        if(closest > THIRTY_DEGREES || duiplicateCount <= 0)
        {
            directions.push({
                    node: i - 1,
                    direction: getRouteAction(optionTurn, correctOption.type, edgeOut.startNode.id == thisStop.id, intersection),
                    show: true,
                    prompt: false
                });

            continueFrom = thisStop;
            continueType = edgeOut.type;

            continue;
        }

        let left = false;

        for(const option of optionsAtThisStop)
        {
            if(option == correctOption)
            {
                break;
            }

            if(option.type == correctOption.type)
            {
                left = true;
            }
        }

        directions.push({
            node: i - 1,
            direction: getRouteAction(optionTurn, correctOption.type, edgeOut.startNode.id == thisStop.id, intersection, left ? "right" : "left"),
            show: true,
            prompt: false
        });

        continueFrom = thisStop;
        continueType = edgeOut.type;
    }

    directions.push({
        node: stops.length - 1,
        direction: "You have arrived at your destination!",
        show: true,
        prompt: false
    });
}

function populateDirectionsIndoors(route: Route, startIndex: number, wasOutdoors: boolean): number
{
    const paths = route.route;
    const stops = route.stops;

    const directions: Direction[] = route.directions;

    if(wasOutdoors)
    {
        directions.push({
            direction: getRouteAction("straight", paths[startIndex].type, paths[startIndex].startNode.id == stops[startIndex].id) + ` to enter ${stops[startIndex + 1].building?.name}`,
            show: true,
            prompt: false,
            node: startIndex - 1
        });

        startIndex++;
    }

    let leftCount = 0;
    let rightCount = 0;

    let lastLeft: Node | null = null;
    let lastRight: Node | null = null;


    let continueFrom: Node | null = null;
    let continueType = "";

    for(let i = startIndex; i < paths.length; i++)
    {
        if(!paths[i - 1].indoors)
        {
            return i;
        }

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

        const turnType = getTurnType(correctOption.relativeAngle)

        if(turnType == "straight" && correctOption.type == continueType)
        {
            for(let j = 0; j < optionsAtThisStop.length; j++)
            {
                if(j == optionIndex)
                {
                    continue;
                }

                if(optionsAtThisStop[j].type != "door")
                {
                    if(j < optionIndex)
                    {
                        leftCount++;
                    }
                    else
                    {
                        rightCount++;
                    }
                }
                
                if(!optionsAtThisStop[j].node.name.startsWith("~"))
                {
                    if(j < optionIndex)
                    {
                        lastLeft = optionsAtThisStop[j].node;
                    }
                    else
                    {
                        lastRight = optionsAtThisStop[j].node;
                    }
                }
            }

            continue;
        }

        if(continueFrom && continueFrom != lastStop)
        {
            directions.push({
                node: i - 1,
                direction: getRouteAction("straight", edgeIn.type, edgeIn.endNode.id == thisStop.id) + ` for ${getTensOfFeetIndoors(continueFrom, thisStop)} feet`,
                show: true,
                prompt: false
            });
        }
        else if(continueFrom)
        {
            directions.push({
                node: i - 1,
                direction: getRouteAction("straight", edgeIn.type, edgeIn.endNode.id == thisStop.id),
                show: true,
                prompt: false
            });
        }

        if((correctOption.type == "stairs" || correctOption.type == "stairwell" || correctOption.type == "elevator") && thisStop.floor != nextStop.floor)
        {
            i = takeElevatorDirections(route, i, correctOption.type == "elevator" ? "elevator" : "stairs");
            i--;
            continue;
        }

        if(turnType == "straight")
        {
            directions.push({
                node: i - 1,
                direction: getRouteAction("straight", correctOption.type, edgeOut.startNode.id == thisStop.id),
                show: true,
                prompt: false
            });

            directions.push({
                node: i - 1,
                direction: getTakenRouteQuestion(correctOption.type),
                show: true,
                prompt: true
            });
        }
        else
        {
            const left = correctOption.relativeAngle < 0;

            let instruction = "";
            
            const waypoint = left ? lastLeft : lastRight;
            const count = left ? leftCount : rightCount;

            instruction = `Take the ${getOrdinalName(count + 1)} ${left ? "left" : "right"} and `;

            if(waypoint)
            {
                instruction += `(after passing ${waypoint.name} on your ${left ? "left" : "right"}) `
            }

            instruction += getRouteAction("straight", edgeOut.type, edgeOut.startNode.id == thisStop.id).toLowerCase();

            directions.push({
                node: i - 1,
                direction: instruction,
                show: true,
                prompt: false
            });

            directions.push({
                node: i - 1,
                direction: left ? "Have you turned left?" : "Have you turned right?",
                show: true,
                prompt: true
            });
        }

        continueFrom = thisStop;
        continueType = edgeOut.type;
        leftCount = 0;
        rightCount = 0;
        lastLeft = null;
        lastRight = null;
    }

    return stops.length;
}

function takeElevatorDirections(route: Route, startIndex: number, type: "elevator" | "stairs"): number
{
    let endIndex = startIndex;

    for(; route.route[endIndex].type == type; endIndex++);

    const startFloor = route.stops[startIndex].floor;
    const endFloor = route.stops[endIndex - 1].floor;

    const up = startFloor > endFloor;

    const directions = `Take the ${type} ${up ? "up" : "down"} to floor ${endFloor}.`;

    route.directions.push({
        node: endIndex - 1,
        direction: directions,
        show: true,
        prompt: false
    });

    route.directions.push({
        node: endIndex - 1,
        direction: `Have you arrived at floor ${endFloor}?`,
        show: true,
        prompt: true
    });

    return endIndex - 1;
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

function getIntersectionType(options: Option[]): IntersectionType
{
    if(options.length <= 1)
    {
        return "";
    }

    if(options.length > 2)
    {
        return "intersection";
    }

    const angleBetween = Math.abs(options[0].relativeAngle - options[1].relativeAngle);

    if(angleBetween > ONE_HUNDRED_EIGHTY_DEGREES - TEN_DEGREES)
    {
        return "T";
    }

    const centered = (options[0].relativeAngle + options[1].relativeAngle) / 2 < FIFTEEN_DEGREES;

    if(centered)
    {
        return "fork";
    }

    if(getTurnType(options[0].relativeAngle) == "straight" || getTurnType(options[0].relativeAngle) == "straight")
    {
        return "branch";
    }

    return "intersection";
}

function getRouteAction(turnType: TurnType, routeType: RouteType, forwards: boolean, intersectionLocation: IntersectionType = "", specifier: string = "", specifierLiteral: boolean = false): string
{
    let output = "";

    if(intersectionLocation != "")
    {
        output += "At the " + intersectionLocation + ", "
    }

    let turnText = getTurnAction(turnType);

    if(output != "")
    {
        turnText = turnText.toLowerCase();
    }

    if(turnText != "")
    {
        output += turnText + " to ";
    }


    if(specifier != "")
    {
        specifier = specifier.trim() + " ";
    }

    let specLit = "";

    if(specifierLiteral)
    {
        specLit = " to the " + specifier;
        specifier = "";
    }

    let action = "";

    switch(routeType)
    {
        case "stairs":
            action = forwards ? `Go up the ${specifier}stairs${specLit}` : `Go down the ${specifier}stairs${specLit}`;
            break;
        case "ramp":
            action = forwards ? `Go up the ${specifier}ramp${specLit}` : `Go down the ${specifier}ramp${specLit}`;
            break;
        case "room":
            action = `Go through the room`;
            break;
        case "sidewalk":
            action = `Continue along the ${specifier}sidewalk${specLit}`;
            break;
        case "hallway":
            action = `Continue down the ${specifier}hall${specLit}`;
            break;
        case "crosswalk":
            action = `Take the ${specifier}crosswalk${specLit}`;
            break;
        case "door":
            action = `Go through the ${specifier}door${specLit}`;
            break;
        case "doorway":
            action = `Go through the ${specifier}doorway${specLit}`;
            break;
        case "bridge":
            action = `Cross the ${specifier}bridge${specLit}`;
            break;
        default:
            action = `Take the ${specifier}${routeType}${specLit}`;
    }

    if(output != "")
    {
        action = action.toLowerCase();
    }

    output += action;

    return output;
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
        return "sharp right";
    }
}

function getTurnAction(turnType: TurnType, intersection: boolean = false)
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
            return intersection ? "Continue straight" : "";
        case "sharp right":
            return "Make a sharp right turn";
        case "right":
            return "Turn right";
        case "slight right":
            return "Make a slight right";
    }
}

function getTakenRouteQuestion(routeType: RouteType)
{
    switch(routeType)
    {
        case "door":
            return "Have you gone through the door?";
        case "doorway":
            return "Have you gone through the doorway?";
        case "elevator":
            return "Have you taken the elevator?";
        case "hallway":
            return "Have you gone down the hallway?";
        case "ramp":
            return "Have you taken the ramp?";
        case "room":
            return "Have you crossed the room?";
        case "stairs":
        case "stairwell":
            return "Have you taken the stairs?";
        default:
            return `Have you taken the ${routeType}?`;
    }
}

function getOrdinalName(n: number): string
{
    switch(n)
    {
        case 1:
            return "first";
        case 2:
            return "second";
        case 3:
            return "third";
        case 4:
            return "fourth";
        case 5:
            return "fifth";
        case 6:
            return "sixth";
        case 7:
            return "seventh";
        case 8:
            return "eighth";
        case 9:
            return "ninth";
        case 10:
            return "tenth";
        default:
            return `${n}th`;
    }
}

interface Option
{
    relativeAngle: number;
    type: RouteType;
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

export function metersToFeet(meters: number): number
{
    return meters * 3.28084;
}

function getTensOfFeetIndoors(a: Node, b: Node): number
{
    const xDiff = a.x - b.x;
    const yDiff = a.y - b.y;

    const feet = Math.round(metersToFeet(Math.sqrt(xDiff * xDiff + yDiff * yDiff)));

    return feet - (feet % 10);
}

function getTensOfFeetOutdoors(a: Node, b: Node): number
{
    let dist = getDistanceMeters(a, b);
    dist = Math.round(metersToFeet(dist));
    dist = dist % 10 >= 5 ? dist + (10 - (dist % 10)) : dist - (dist % 10);

    return dist;
}