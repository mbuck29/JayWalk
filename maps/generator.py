"""
 * File: generator.py
 * Purpose: A helper script for making map data
 * Author: C. Cooper
 * Date Created: 2026-02-05
 * Date Modified: 2026-02-13
"""

from json import dump, load
from math import dist

# The id of the building we are entering data for
buildingId: int = -1
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

    # Load the next avaliable edge/node ids as the current respective max + 1
    nextEdgeId = max([edge["id"] for edge in edges]) + 1
    nextNodeId = max([node["id"] for node in nodes]) + 1

    while True:
        # Get the base command from the user
        whatDo = input("What would you like to do: ").strip().lower()

        if whatDo == "add": # Add to the graph
            start = getNode("Please enter the starting coordinates: ", nodes)
            add(start, edges, nodes)
        elif whatDo == "save": # Save the graph
            edgeFile = open("edges.json", 'w')
            nodeFile = open("nodes.json", 'w')
            dump(edges, edgeFile, indent=4)
            dump(nodes, nodeFile, indent=4)
            edgeFile.close()
            nodeFile.close()
        elif whatDo == "stop": # Stop the program
            break

def getCoords(message: str) -> tuple[float, float]:
    """Get a pair of coordinates from the user

    Args:
        message (str): The message to display when asking for the coords

    Returns:
        tuple[float, float]: A latitude, longitude coordinate pair
    """
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
    epsSquared = (epsilon * 100000) ** 2
    nodeX: float = node["x"] * 100000
    nodeY: float = node["y"] * 100000

    closest = None
    closestDist = 1 << 31

    # Find the closest node
    for otherNode in nodes:
        oX: float = otherNode["x"] * 100000
        oY: float = otherNode["y"] * 100000
        dSquared = (nodeX - oX) ** 2 + (nodeY - oY) ** 2
        
        if dSquared < closestDist:
            closest = otherNode
            closestDist = dSquared

    # If the closest node is nearer than epsilon, request to merge
    if closestDist < epsSquared and closest is not None:
        merge = input(f"Merge with node {closest["name"]} at {closest["y"]:0.4f}, {closest["x"]:0.4f}? ").strip().lower()

        if merge == "yes" or merge == "y":
            return closest
    
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
    global buildingId

    # Get coords from the user
    coords = getCoords(coordsMessage)

    # Build the node dict
    node = {
        "id": -1,
        "name": "",
        "x": coords[1],
        "y": coords[0],
        "buildingId": buildingId,
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
        
        # Get whether the edge is indoors, defaulting to the value for the last edge
        edgeIndoors = input("Is the path indoors? ").lower().strip()
        if edgeIndoors == "":
            edgeIndoors = lastEdgeIndoors
        else:
            edgeIndoors = (edgeIndoors == "y") or (edgeIndoors == "yes") or (edgeIndoors == "true")

        lastEdgeType = edgeType
        lastEdgeAccess = edgeAccess
        lastEdgeIndoors = edgeIndoors

        # Make the new edge object
        newEdge = {
            "id": nextEdgeId,
            "startNodeId": start["id"],
            "endNodeId": next["id"],
            "length": dist([start["x"], next["x"]], [start["y"], next["y"]]),
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