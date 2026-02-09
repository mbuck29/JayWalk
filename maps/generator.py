from json import dump, load
from math import dist

buildingId: int = -1
nextNodeId: int = -1
nextEdgeId: int = -1

lastEdgeType = ""
lastEdgeAccess = True
lastEdgeIndoors = False

def main():
    edgeFile = open("edges.json", 'r')
    nodeFile = open("nodes.json", 'r')

    edges = load(edgeFile)
    nodes: list[dict] = load(nodeFile)

    edgeFile.close()
    nodeFile.close()

    global nextNodeId
    global nextEdgeId

    nextEdgeId = max([edge["id"] for edge in edges]) + 1
    nextNodeId = max([node["id"] for node in nodes]) + 1

    while True:
        whatDo = input("What would you like to do: ").strip().lower()

        if whatDo == "add":
            start = getNode("Please enter the starting coordinates: ", nodes)
            add(start, edges, nodes)
        elif whatDo == "save":
            edgeFile = open("edges.json", 'w')
            nodeFile = open("nodes.json", 'w')
            dump(edges, edgeFile, indent=4)
            dump(nodes, nodeFile, indent=4)
            edgeFile.close()
            nodeFile.close()
        elif whatDo == "stop":
            break




def getCoords(message: str) -> tuple[float, float]:
    cString = input(message)

    strings = cString.split(",")

    return (float(strings[0].strip()), float(strings[1].strip()))

def mergeNodeAsNeeded(node: dict, nodes: list[dict], epsilon: float = 0.000009 * 10) -> dict:
    epsSquared = (epsilon * 100000) ** 2
    nodeX: float = node["x"] * 100000
    nodeY: float = node["y"] * 100000

    closest = None
    closestDist = 1 << 31

    for otherNode in nodes:
        oX: float = otherNode["x"] * 100000
        oY: float = otherNode["y"] * 100000
        dSquared = (nodeX - oX) ** 2 + (nodeY - oY) ** 2
        
        if dSquared < closestDist:
            closest = otherNode
            closestDist = dSquared

    if closestDist < epsSquared and closest is not None:
        merge = input(f"Merge with node {closest["name"]} at {closest["y"]:0.4f}, {closest["x"]:0.4f}? ").strip().lower()

        if merge == "yes" or merge == "y":
            return closest
    
    return node

def getNode(coordsMessage: str, nodes: list[dict]) -> dict:
    global nextNodeId
    global buildingId
    coords = getCoords(coordsMessage)
    node = {
        "id": -1,
        "name": "",
        "x": coords[1],
        "y": coords[0],
        "buildingId": buildingId,
        "edgeIds": []
    }

    node = mergeNodeAsNeeded(node, nodes)

    if node["id"] == -1:
        node["id"] = nextNodeId
        nextNodeId += 1

        name = input("Enter the node's name: ")
        node["name"] = name

    return node



def add(start: dict, edges: list[dict], nodes: list[dict], stay: bool = False):
    global lastEdgeType
    global lastEdgeAccess
    global lastEdgeIndoors
    global nextEdgeId

    while True:
        next = getNode("Please enter the end coordinates: ", nodes)
        edgeType = ""
        while edgeType == "":
            edgeType = input("Enter the edge type: ").strip()
            if edgeType == "":
                edgeType = lastEdgeType

        edgeAccess = input("Is the path accessible? ").lower().strip()
        if edgeAccess == "":
            edgeAccess = lastEdgeAccess
        else:
            edgeAccess = (edgeAccess == "y") or (edgeAccess == "yes") or (edgeAccess == "true")
        
        edgeIndoors = input("Is the path indoors? ").lower().strip()
        if edgeIndoors == "":
            edgeIndoors = lastEdgeIndoors
        else:
            edgeIndoors = (edgeIndoors == "y") or (edgeIndoors == "yes") or (edgeIndoors == "true")

        lastEdgeType = edgeType
        lastEdgeAccess = edgeAccess
        lastEdgeIndoors = edgeIndoors

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

        start["edgeIds"].append(newEdge["id"])
        next["edgeIds"].append(newEdge["id"])

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