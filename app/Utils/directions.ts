/**
 * File: directions.ts
 * Purpose: handle generating directions for the user
 * Author: C. Cooper
 * Date Created: 2026-02-20
 * Date Modified: 2026-03-01
 */

import { RouteType } from "@/maps/data";
import { Node } from "@/maps/graph";
import { getDistanceMeters, Route } from "./routing";
import { edgeHas, edgeOther } from "./routingUtils";

type TurnType = "sharp left" | "left" | "slight left" | "straight" | "slight right" | "right" | "sharp right";
type IntersectionType = "intersection" | "T" | "fork" | "branch" | ""

// Degrees in radians
const FIVE_DEGREES = 5 / 180 * Math.PI;
const TEN_DEGREES = 10 / 180 * Math.PI;
const FIFTEEN_DEGREES = 15 / 180 * Math.PI;
const THIRTY_DEGREES = 30 / 180 * Math.PI;
const FORTY_FIVE_DEGREES = 45 / 180 * Math.PI;
const NINETY_DEGREES = 90 / 180 * Math.PI;
const ONE_HUNDRED_EIGHTY_DEGREES = 180 / 180 * Math.PI;

/**
 * A direction at a given navigation step
 */
export interface Direction
{
    /** The node this direction leads to */
    node: number;
    /** The text to show the user */
    direction: string;
    show: boolean;
    prompt: boolean;
}

/**
 * Fills in the directions list for the given route
 * @param route The route to populate the list for

 */
export function populateDirections(route: Route)
{
    const paths = route.route;
    const stops = route.stops;

    if(stops.length < 2)
    {
        return;
    }

    const directions: Direction[] = route.directions;

    let continueFromIndex = 0;
    let continueFrom: Node | null = canBeMerged(paths[0].type) ? stops[0] : null;
    let continueType: RouteType = paths[0].type;

    let i = 1;

    if(paths[0].indoors)
    {
        i = populateDirectionsIndoors(route, 0, false);
    }
    else if(!continueFrom)
    {
        directions.push({
            node: 0,
            direction: getRouteAction("straight", continueType, stops[0].id == paths[0].startNode.id, getTensOfFeetOutdoors(paths[0].startNode, paths[0].endNode)),
            show: true,
            prompt: false
        });
    }

    // For each node,
    for(; i < paths.length; i++)
    {
        const lastStop = stops[i - 1];
        const thisStop = stops[i];
        const nextStop = stops[i + 1];
        const edgeIn = paths[i - 1];
        const edgeOut = paths[i];

        if(continueFrom && continueType == "ignore")
        {
            continueFrom = null;
        }

        // If it is indoors, move to the indoor handler
        if(edgeOut.indoors)
        {
            const skipTo = populateDirectionsIndoors(route, i, !edgeIn.indoors);
            i = skipTo - 1;

            continueFrom = null;
            continueType = "ignore";
            continue;
        }

        if(edgeOut.type == "ignore")
        {
            continue;
        }

        const distance = getTensOfFeetOutdoors(thisStop, nextStop);

        // Get all of the edges we could take out
        const optionsAtThisStop = getOptions(lastStop, thisStop, nextStop);

        let optionIndex = -1;
        let correctOption;

        // Get the option we need to take
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

        // Merge together same-type nodes in a line
        if(continueFrom && (optionTurn == "straight" || optionsAtThisStop.length == 1) && correctOption.type == continueType)
        {
            continue;
        }

        // Make the directions for any merged nodes
        if(continueFrom)
        {
            const continueDistance = getTensOfFeetOutdoors(continueFrom, thisStop);

            directions.push({
                node: continueFromIndex,
                direction: getRouteAction("straight", continueType, edgeIn.endNode.id == thisStop.id, continueDistance),
                show: true,
                prompt: false
            });

            continueFrom = null;
            continueType = "ignore";
        }

        // If we only have one option, populate its directions
        if(optionsAtThisStop.length == 1)
        {
            if(optionTurn != "straight" || !canBeMerged(edgeOut.type))
            {
                directions.push({
                    node: i,
                    direction: getRouteAction(optionTurn, correctOption.type, edgeOut.startNode.id == thisStop.id),
                    show: edgeIn.type != edgeOut.type,
                    prompt: false
                });
            }

            continueFromIndex = i;
            continueFrom = canBeMerged(edgeOut.type) ? thisStop : null;
            continueType = edgeOut.type;

            continue;
        }

        const intersection = true ? "" : getIntersectionType(optionsAtThisStop);

        // If we have two directions,
        if(optionsAtThisStop.length == 2)
        {
            const couldBeConfused = Math.abs(optionsAtThisStop[0].relativeAngle - optionsAtThisStop[1].relativeAngle) < THIRTY_DEGREES + FIVE_DEGREES;

            // If they couldn't be confused, populate their directions basically
            if(!couldBeConfused)
            {
                if(optionTurn != "straight" || !canBeMerged(edgeOut.type))
                {
                    directions.push({
                        node: i,
                        direction: getRouteAction(optionTurn, correctOption.type, edgeOut.startNode.id == thisStop.id),
                        show: edgeIn.type != edgeOut.type,
                        prompt: false
                    });
                }

                continueFromIndex = i;
                continueFrom = canBeMerged(edgeOut.type) ? thisStop : null;
                continueType = edgeOut.type;

                continue;
            }

            // If they could be confused but have different types, populate their directions basically
            if(optionsAtThisStop[0].type != optionsAtThisStop[1].type)
            {
                if(optionTurn != "straight" || !canBeMerged(edgeOut.type))
                {
                    directions.push({
                        node: i,
                        direction: getRouteAction(optionTurn, correctOption.type, edgeOut.startNode.id == thisStop.id),
                        show: edgeIn.type != edgeOut.type,
                        prompt: false
                    });
                }

                continueFromIndex = i;
                continueFrom = canBeMerged(edgeOut.type) ? thisStop : null;
                continueType = edgeOut.type;

                continue;
            }

            const leftIsCorrect = optionIndex == 0;

            // If they could be confused and have the same type, specify to choose the left or right one
            directions.push({
                    node: i,
                    direction: getRouteAction(optionTurn, correctOption.type, edgeOut.startNode.id == thisStop.id, -1, intersection, leftIsCorrect ? "left" : "right"),
                    show: true,
                    prompt: false
                });

            continueFromIndex = i;
            continueFrom = canBeMerged(edgeOut.type) ? thisStop : null;
            continueType = edgeOut.type;

            continue;
        }

        // If there are more than two options,
        let closest = 100;

        // Get the closest two options
        if(optionIndex > 0)
        {
            closest = Math.min(closest, Math.abs(correctOption.relativeAngle - optionsAtThisStop[optionIndex - 1].relativeAngle));
        }

        if(optionIndex < optionsAtThisStop.length - 1)
        {
            closest = Math.min(closest, Math.abs(correctOption.relativeAngle - optionsAtThisStop[optionIndex + 1].relativeAngle));
        }

        let duiplicateCount = -1;

        // Check how many options of the same type there are
        for(const option of optionsAtThisStop)
        {
            if(option.type == correctOption.type)
            {
                duiplicateCount++;
            }
        }

        // If they coundn't be confused, give basic direcitons
        if(closest > THIRTY_DEGREES || duiplicateCount <= 0)
        {
            if(optionTurn != "straight" || !canBeMerged(edgeOut.type))
            {
                directions.push({
                    node: i,
                    direction: getRouteAction(optionTurn, correctOption.type, edgeOut.startNode.id == thisStop.id),
                    show: edgeIn.type != edgeOut.type,
                    prompt: false
                });
            }

            continueFromIndex = i;
            continueFrom = canBeMerged(edgeOut.type) ? thisStop : null;
            continueType = edgeOut.type;

            continue;
        }

        let left = false;

        // Check if the potential confution is on the left
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

        // Give a direction specifying which route (L/R) to take
        directions.push({
            node: i - 1,
            direction: getRouteAction(optionTurn, correctOption.type, edgeOut.startNode.id == thisStop.id, distance, intersection, left ? "right" : "left"),
            show: true,
            prompt: false
        });

        continueFromIndex = i;
        continueFrom = canBeMerged(edgeOut.type) ? thisStop : null;
        continueType = edgeOut.type;
    }

    // If there is still a continueFrom, flush it
    if(continueFrom && !continueFrom.building)
    {
        const distance = getTensOfFeetOutdoors(continueFrom, stops[stops.length - 1]);

        directions.push({
            node: stops.length - 1,
            direction: getRouteAction("straight", continueType, paths[paths.length - 1].endNode.id == stops[stops.length - 1].id, distance),
            show: true,
            prompt: false
        });

        continueFrom = null;
        continueType = "ignore";
    }

    directions.push({
        node: stops.length - 1,
        direction: "You have arrived at your destination!",
        show: true,
        prompt: false
    });
}

/**
 * Handle making directions indoors
 * @param route The route to add directions to
 * @param startIndex The node index to start from
 * @param wasOutdoors Whether we are coming from outdoors
 * @returns The index of the next node to start from
 */
function populateDirectionsIndoors(route: Route, startIndex: number, wasOutdoors: boolean): number
{
    const paths = route.route;
    const stops = route.stops;

    const directions: Direction[] = route.directions;

    // Handle going through the door to come in if coming from outdoors
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

    const startPath = paths[startIndex];

    if((startPath.type == "stairs" || startPath.type == "stairwell" || startPath.type == "elevator") && stops[startIndex].floor != stops[startIndex + 1].floor)
    {
        startIndex = takeElevatorDirections(route, startIndex, startPath.type);
        while(startIndex > stops.length)
        {
            startIndex--;
        }
        const destFloor = stops[startIndex].floor;

        while(stops[startIndex].floor == destFloor)
        {
            startIndex--;
        }

        startIndex++;
    }

    let leftCount = 0;
    let rightCount = 0;

    let lastLeft: Node | null = null;
    let lastRight: Node | null = null;

    let continueFromIndex = startIndex;
    let continueFrom: Node | null = canBeMerged(paths[startIndex].type) ? stops[startIndex] : null;
    let continueType = paths[startIndex].type;

    if(startIndex == 0 && continueFrom)
    {
        startIndex++;
    }
    else if(startIndex == 0)
    {
        directions.push({
            node: 0,
            direction: getRouteAction("straight", continueType, stops[0].id == paths[0].startNode.id, getTensOfFeetOutdoors(paths[0].startNode, paths[0].endNode)),
            show: true,
            prompt: false
        });

        startIndex++;
    }

    // For each stop,
    for(let i = startIndex; i < paths.length; i++)
    {
        // If we are outdoors, quit
        if(!paths[i - 1].indoors)
        {
            return i;
        }

        const lastStop = stops[i - 1];
        const thisStop = stops[i];
        const nextStop = stops[i + 1];
        const edgeIn = paths[i - 1];
        const edgeOut = paths[i];

        const changingBuildings = thisStop.building?.id != nextStop.building?.id;

        if(edgeOut.type == "ignore" && !changingBuildings)
        {
            continue;
        }

        // Get all the options we could do
        const optionsAtThisStop = getOptions(lastStop, thisStop, nextStop);

        let optionIndex = -1;
        let correctOption;

        // Get the correct option
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

        // Get the correct turn type
        const turnType = getTurnType(correctOption.relativeAngle)


        // Merge together same-type edges in a straight line
        if((turnType == "straight" || turnType == "slight left" || turnType == "slight right") && correctOption.type == continueType && !changingBuildings)
        {
            // Keep track of the number of halls to the left/right along with landmarks
            for(let j = 0; j < optionsAtThisStop.length; j++)
            {
                if(j == optionIndex)
                {
                    continue;
                }

                if(optionsAtThisStop[j].type == "hallway")
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

        // Add directions for the continueFrom
        if(continueFrom && continueFrom != lastStop)
        {
            const continueDistance = getTensOfFeetIndoors(continueFrom, thisStop);

            directions.push({
                node: continueFromIndex,
                direction: getRouteAction("straight", continueType, edgeIn.endNode.id == thisStop.id, continueDistance),
                show: true,
                prompt: false
            });
        }
        else if(continueFrom)
        {
            const continueDistance = getTensOfFeetIndoors(continueFrom, thisStop);

            directions.push({
                node: continueFromIndex,
                direction: getRouteAction("straight", continueType, edgeIn.endNode.id == thisStop.id, continueDistance),
                show: true,
                prompt: false
            });
        }

        if(changingBuildings)
        {
            if(edgeOut.type != "ignore")
            {
                directions.push({
                    node: i,
                    direction: getRouteAction("straight", edgeOut.type, edgeOut.startNode.id == thisStop.id),
                    show: true,
                    prompt: false
                });
            }

            if(!nextStop.building)
            {
                directions.push({
                    node: i,
                    direction: `Leaving ${thisStop.building?.name ?? "the building"}`,
                    show: true,
                    prompt: false
                });

                return i + 1;
            }

            directions.push({
                node: i+1,
                direction: `Entering ${nextStop.building.name}`,
                show: true,
                prompt: false
            });

            i++;

            leftCount = 0;
            rightCount = 0;
            lastLeft = null;
            lastRight = null;
            continueFrom = null;
            continueType = "ignore";

            continue;
        }

        // Handle swapping floors
        if((correctOption.type == "stairs" || correctOption.type == "stairwell" || correctOption.type == "elevator") && thisStop.floor != nextStop.floor)
        {
            i = takeElevatorDirections(route, i, correctOption.type);
            while(i > stops.length)
            {
                i--;
            }
            const destFloor = stops[i].floor;

            while(stops[i].floor == destFloor)
            {
                i--;
            }

            leftCount = 0;
            rightCount = 0;
            lastLeft = null;
            lastRight = null;
            continueFrom = null;
            continueType = "ignore";

            continue;
        }

        if(turnType == "straight" || turnType == "slight left" || turnType == "slight right")
        {
            if(!canBeMerged(edgeOut.type))
            {
                directions.push({
                    node: i,
                    direction: getRouteAction(turnType, edgeOut.type, edgeOut.startNode.id == thisStop.id, getTensOfFeetIndoors(thisStop, nextStop)),
                    show: true,
                    prompt: false
                });
            }
        }
        else
        {
            // Handle telling the user to turn based on landmarks
            const left = correctOption.relativeAngle < 0;

            let instruction = "";
            
            const waypoint = left ? lastLeft : lastRight;
            const count = left ? leftCount : rightCount;

            instruction = count > 1 ? `Take the ${getOrdinalName(count + 1)} ${left ? "left" : "right"} to ` : `Turn ${left ? "left" : "right"} to `;

            if(waypoint && getTensOfFeetIndoors(thisStop, waypoint) <= 20)
            {
                instruction += `(after passing ${waypoint.name} on your ${left ? "left" : "right"}) `
            }

            instruction += getRouteAction("straight", edgeOut.type, edgeOut.startNode.id == thisStop.id).toLowerCase();

            directions.push({
                node: i,
                direction: instruction,
                show: true,
                prompt: false
            });
        }

        continueFromIndex = i;
        continueFrom = canBeMerged(edgeOut.type) ? thisStop : null;
        continueType = edgeOut.type;
        leftCount = 0;
        rightCount = 0;
        lastLeft = null;
        lastRight = null;
    }

    return stops.length;
}

/**
 * Handle directions that span multiple floors
 * @param route The route to add directions to
 * @param startIndex The index to start from
 * @param type The type of route we are handling
 * @returns The index of the next node to start from
 */
function takeElevatorDirections(route: Route, startIndex: number, type: "elevator" | "stairs" | "stairwell"): number
{
    let endIndex = startIndex;

    // Move endIndex to the last edge of this type
    for(; endIndex < route.route.length && route.route[endIndex].type == type; endIndex++);

    // Get the start/end floors
    const startFloor = route.stops[startIndex].floor;
    const endFloor = route.stops[endIndex].floor;

    // Get whether the route is going up
    const up = startFloor < endFloor;

    // Get the direction string
    const directions = `Take the ${type} ${up ? "up" : "down"} to floor ${endFloor}`;

    // Add the directions
    route.directions.push({
        node: endIndex - 1,
        direction: directions,
        show: true,
        prompt: false
    });

    return endIndex;
}

/**
 * Get the angle of the edge between two nodes in the global coordiante system
 * @param node1 The first node
 * @param node2 The second node
 * @returns The angle of the edge between two nodes in the global coordiante system
 */
function getAngle(node1: Node, node2: Node): number
{
    let angle = Math.atan2(node1.y - node2.y, node1.x - node2.x);

    // Normalize -180 to 180
    return normalizeAngle(angle);
}

/**
 * Normalize the given angle -180 to 180
 * @param angle The angle to nromalize
 * @returns The equivelant angle bwteen -180 degrees and 180 degrees
 */
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

/**
 * Gets the intersection type based on the edge options
 * @param options The pathes the user could take
 * @returns The intersection type 
 */
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

/**
 * Get the action string for the described route edge
 * @param turnType How the user is turning
 * @param routeType The route type
 * @param forwards Whether the route is going startNode to endNode
 * @param intersectionLocation The intersection type
 * @param specifier The specifier L/R
 * @param specifierLiteral Whether the specifier is literal
 * @returns The action string
 */
function getRouteAction(turnType: TurnType, routeType: RouteType, forwards: boolean, distance = -1, intersectionLocation: IntersectionType = "", specifier: string = "", specifierLiteral: boolean = false): string
{
    let output = "";

    // Add the intersection
    if(intersectionLocation != "")
    {
        output += "At the " + intersectionLocation + ", "
    }

    // Add the turn
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

    // Add the action
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
        case "steps":
            action = forwards ? `Go up the ${specifier}steps${specLit}` : `Go down the ${specifier}steps${specLit}`;
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
        case "atrium":
            action = `Cross the atrium`;
            break;
        default:
            action = `Take the ${specifier}${routeType}${specLit}`;
    }

    if(output != "")
    {
        action = action.toLowerCase();
    }

    output += action;

    if(distance > 0 && turnType == "straight" && shouldShowDistance(routeType))
    {
        output += ` for ${distance} feet`
    }

    return output;
}

/**
 * Get the turn type based on a turn angle
 * @param angle The angle to get the type of
 * @returns The turn type string
 */
function getTurnType(angle: number): TurnType
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

/**
 * Gets the action string for a given turn type
 * @param turnType The turn to get the string for
 * @param intersection Whether we are at an intersection
 * @returns The action string for the turn
 */
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

/**
 * Gets the ordinal name for a given number
 * @param n The number
 * @returns The ordinal string
 */
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

/**
 * An option that a user could take at a given node
 */
interface Option
{
    relativeAngle: number;
    type: RouteType;
    node: Node;
}

/**
 * Gets the options that the user could take at the given node
 * @param nodeIn The node we are coming from
 * @param node The current node
 * @returns The Options at this Node
 */
function getOptions(nodeIn: Node, node: Node, nodeOut: Node): Option[]
{
    const baseAngle = nodeIn.building == node.building ? getAngle(nodeIn, node) : getAngle(node, nodeOut);

    const options: Option[] = [];

    // Get the option for each edge that we aren't coming from
    for(const edge of node.edges)
    {
        if(edgeHas(edge, nodeIn))
        {
            continue;
        }

        const otherNode = edgeOther(edge, node);

        let angle = getAngle(node, otherNode);

        // Offset the angle by this edge's angle so it is relative
        angle -= baseAngle;

        angle = normalizeAngle(angle);

        options.push({
            relativeAngle: angle,
            type: edge.type,
            node: otherNode
        });
    }

    // Sort the options by their relative angles
    options.sort((a, b) => a.relativeAngle - b.relativeAngle);

    return options;
}

/**
 * Converts meters to feet
 * @param meters The amount of meters
 * @returns An amount of feet
 */
export function metersToFeet(meters: number): number
{
    return meters * 3.28084;
}

/**
 * Gets the number of feet between the given nodes indoors, rounded to the nearest ten
 * @param a The first Node
 * @param b The second Node
 * @returns The number of feet between the given nodes, rounded to the nearest ten
 */
function getTensOfFeetIndoors(a: Node, b: Node): number
{
    const xDiff = a.x - b.x;
    const yDiff = a.y - b.y;

    const feet = Math.round(metersToFeet(Math.sqrt(xDiff * xDiff + yDiff * yDiff))) + 5;

    return feet - (feet % 10);
}

/**
 * Gets the number of feet between the given nodes outdoors, rounded to the nearest ten
 * @param a The first Node
 * @param b The second Node
 * @returns The number of feet between the given nodes, rounded to the nearest ten
 */
function getTensOfFeetOutdoors(a: Node, b: Node): number
{
    let dist = getDistanceMeters(a, b);
    dist = Math.round(metersToFeet(dist));
    dist = dist % 10 >= 5 ? dist + (10 - (dist % 10)) : dist - (dist % 10);

    return dist;
}

function shouldShowDistance(type: RouteType): boolean
{
    switch(type)
    {
        case "bridge":
        case "door":
        case "doorway":
        case "elevator":
        case "ignore":
        case "stairwell":
        case "steps":
            return false;
    }

    return true;
}

function canBeMerged(type: RouteType): boolean
{
    switch(type)
    {
        case "door":
        case "doorway":
        case "ignore":
            return false;
    }

    return true;
}