"""
 * File: generator.py
 * Purpose: A helper script for making map data
 * Author: C. Cooper
 * Date Created: 2026-02-05
 * Date Modified: 2026-02-13
"""

from json import dump, load
from math import dist
from multiprocessing import Pipe, Process
from multiprocessing.connection import PipeConnection

from indoorMap import display

building: dict | None = None
floor: int = -1
# The next free id for nodes
nextNodeId: int = -1
# The next free id for edges
nextEdgeId: int = -1

# The edge type of the last edge created
lastEdgeType = ""
# Whether the last edge created was accessible
lastEdgeAccess = True
# Whether the last edge created was indoors
lastEdgeIndoors = False

pipe: PipeConnection | None = None
showProcess: Process | None = None

def main():
    edgeFile = open("edges.json", 'r')
    nodeFile = open("nodes.json", 'r')

    # Load the edges and nodes data from their files
    edges: list[dict] = load(edgeFile)
    nodes: list[dict] = load(nodeFile)

    edgeFile.close()
    nodeFile.close()

    global nextNodeId
    global nextEdgeId
    global floor
    global building
    global showProcess
    global pipe

    # Load the next avaliable edge/node ids as the current respective max + 1
    nextEdgeId = max([edge["id"] for edge in edges]) + 1
    nextNodeId = max([node["id"] for node in nodes]) + 1

    while True:
        # Get the base command from the user
        whatDo = input("What would you like to do: ").strip().lower()

        if whatDo.startswith("add"): # Add to the graph
            start = getNode("Please enter the starting coordinates: ", nodes)
            add(start, edges, nodes, whatDo.endswith("s"))
        elif whatDo == "save": # Save the graph
            edgeFile = open("edges.json", 'w')
            nodeFile = open("nodes.json", 'w')
            dump(edges, edgeFile, indent=4)
            dump(nodes, nodeFile, indent=4)
            edgeFile.close()
            nodeFile.close()
        elif whatDo == "building":
            buildingName = input("Please enter the building name: ")
            buildingFile = open("buildings.json", "r")
            buildings: list[dict] = load(buildingFile)
            buildingFile.close()

            building = None

            for b in buildings:
                if b["name"].lower() != buildingName.lower():
                    continue
                building = b
            
            if building == None:
                print("No building with that name")
            else:
                print(f"Entering {building["name"]}")
        elif whatDo == "floor":
            floor = int(input("Enter the floor number: "))
        elif whatDo.startswith("show"):
            if building == None:
                print("Select a building first!")
                continue
            if pipe != None and showProcess != None and showProcess.is_alive():
                print("Already showing!")
                continue

            b = building

            parentPipe, childPipe = (None, None) if whatDo.endswith("d") else Pipe()

            pipe = parentPipe

            showProcess = Process(target = display, args=[f"{b["name"]}", floor, edges, nodes, childPipe])
            showProcess.start()
        elif whatDo == "stop":
            if showProcess is not None and showProcess.is_alive():
                showProcess.terminate()
            break

def getCoords(message: str) -> tuple[float, float]:
    """Get a pair of coordinates from the user

    Args:
        message (str): The message to display when asking for the coords

    Returns:
        tuple[float, float]: A latitude, longitude coordinate pair
    """
    global building
    global pipe

    cString = None

    while cString is None and (building != None) and (pipe != None):
        print("Select the point in the other window: ", end="", flush=True)
        pipe.send("dataPls")
        cString = pipe.recv()
        print(cString, flush=True)
        right = input("Is that right? ").strip().lower()
        if right == "n" or right == "no":
            cString = None

    if cString is None:
        cString = input(message)

    strings = cString.split(",")

    return (float(strings[0].strip()), float(strings[1].strip()))

def mergeNodeAsNeeded(node: dict, nodes: list[dict], epsilon: float = 0.000009 * 10) -> dict:
    """Check if there is another node near to the given node, and if there is, ask the user whether we should merge the two nodes

    Args:
        node (dict): The node to possiblt merge
        nodes (list[dict]): All of the nodes (except the given one)
        epsilon (float, optional): The minimum distance between nodes before asking to merge. Defaults to 0.000009*10.

    Returns:
        dict: The given node if unmerged, or the node merged into of merged
    """
    global building
    if building != None:
        epsilon = 3

    # Multiplying everything by 100000 to be sure that we don't lose anything to floating point precision
    offset = 1 if building != None else 1000000

    epsSquared = (epsilon * offset) ** 2
    nodeX: float = node["x"] * offset
    nodeY: float = node["y"] * offset

    closest = None
    closestDist = 1 << 31

    # Find the closest node
    for otherNode in nodes:
        oX: float = otherNode["x"] * offset
        oY: float = otherNode["y"] * offset
        dSquared = (nodeX - oX) ** 2 + (nodeY - oY) ** 2
        
        if dSquared < closestDist:
            closest = otherNode
            closestDist = dSquared

    # If the closest node is nearer than epsilon, request to merge
    merge = ""

    while closestDist < epsSquared and closest is not None and merge == "":
        merge = input(f"Merge with node {closest["name"]} at {closest["y"]:0.4f}, {closest["x"]:0.4f}? ").strip().lower()

        if merge == "yes" or merge == "y":
            return closest
        
        if not (merge == "no" or merge == "n"):
            merge = ""
    
    return node

def getNode(coordsMessage: str, nodes: list[dict]) -> dict:
    """Prompt the user to enter a node

    Args:
        coordsMessage (str): The message to display when asking for coordinates
        nodes (list[dict]): All of the nodes in the graph thus far

    Returns:
        dict: A new node specified by the user
    """
    global nextNodeId
    global building
    global floor

    # Get coords from the user
    coords = getCoords(coordsMessage)

    # Build the node dict
    node = {
        "id": -1,
        "name": "",
        "x": coords[1],
        "y": coords[0],
        "buildingId": -1 if building is None else int(building["nodeId"]),
        "floor": -1000 if building is None else floor,
        "edgeIds": []
    }

    # Merge the node with a nearby node if desired
    node = mergeNodeAsNeeded(node, nodes)

    # If the node wasn't merged, give it the next free id
    if node["id"] == -1:
        node["id"] = nextNodeId
        nextNodeId += 1

        name = input("Enter the node's name: ")
        node["name"] = name

    return node

def add(start: dict, edges: list[dict], nodes: list[dict], stay: bool = False):
    """Continue adding to the graph from the given starting node

    Args:
        start (dict): The node to start from
        edges (list[dict]): All of the edges in the graph
        nodes (list[dict]): All of the nodes in the graph
        stay (bool, optional): Whether to stay at the start node after adding an edge or to cross the edge. Defaults to False.
    """
    global lastEdgeType
    global lastEdgeAccess
    global lastEdgeIndoors
    global nextEdgeId

    # Continue adding edges until the user stops
    while True:
        # Get the next node on the edge
        next = getNode("Please enter the end coordinates: ", nodes)

        # Get the edge type, defaulting to the last edge type
        edgeType = ""
        while edgeType == "":
            edgeType = input("Enter the edge type: ").strip()
            if edgeType == "":
                edgeType = lastEdgeType

        # Get whether the edge is accessible, defaulting to the value for the last edge
        edgeAccess = input("Is the path accessible? ").lower().strip()
        if edgeAccess == "":
            edgeAccess = lastEdgeAccess
        else:
            edgeAccess = (edgeAccess == "y") or (edgeAccess == "yes") or (edgeAccess == "true")
        
        global building
        edgeIndoors = building != None

        lastEdgeType = edgeType
        lastEdgeAccess = edgeAccess
        lastEdgeIndoors = edgeIndoors

        # Make the new edge object
        newEdge = {
            "id": nextEdgeId,
            "startNodeId": start["id"],
            "endNodeId": next["id"],
            "length": dist([start["x"], start["y"]], [next["x"], next["y"]]),
            "type": edgeType,
            "accessible": edgeAccess,
            "indoors": edgeIndoors
        }

        nextEdgeId += 1

        # Tell the start and end nodes about the new edge
        start["edgeIds"].append(newEdge["id"])
        next["edgeIds"].append(newEdge["id"])

        # Add the end node to the list of nodes if it is newly created
        if not next in nodes:
            nodes.append(next)
        
        edges.append(newEdge)

        cont = input("Continue?").strip().lower()
        if cont == "exit" or cont == "n" or cont == "no" or cont == "stop":
            break

        if not stay:
            start = next

if __name__ == "__main__":
    main()