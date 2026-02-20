import tkinter as tk
from json import load
from multiprocessing.connection import PipeConnection
from time import sleep

import pyperclip
from PIL import Image, ImageDraw, ImageFont, ImageTk


class Node:
    def __init__(self, x: int, y: int, id: int, name: str):
        self.x = x
        self.y = y
        self.id = id
        self.connected: set[Node] = set()
        self.name = name

hasWindow = False
coords = ""

def main():
    display(input("Enter the building name: "), int(input("Enter the building floor: ")), load(open("edges.json")), load(open("nodes.json")))


def exitWindow(root: tk.Tk):
    global hasWindow
    root.destroy()

def display(buildingName: str, floor: int, dEdges: list[dict], dNodes: list[dict], pipe: PipeConnection | None = None):
    path = f"{buildingName}/{floor}.png"

    buildingFile = open("buildings.json", "r")
    buildings: list[dict] = load(buildingFile)
    buildingFile.close()

    buildingDict = None
    building = -1
    metersPerPixel = 0.0
    originX = 0
    originY = 0

    for b in buildings:
        if b["name"].lower() != buildingName.lower():
            continue
        buildingDict = b

    if buildingDict is None:
        return
    
    building = buildingDict["nodeId"]

    if not (str(floor) in buildingDict["floors"]):
        print(f"No data in {buildingName} for floor {floor}")
        return

    floorDict = buildingDict["floors"][str(floor)]
    metersPerPixel = float(floorDict["metersPerPixel"])
    originX = int(floorDict["originPixelX"])
    originY = int(floorDict["originPixelY"])

    def handleClick(event: tk.Event):
        pyperclip.copy(f"{(event.y - originY) * metersPerPixel}, {(event.x - originX) * metersPerPixel}")

        if (pipe != None) and pipe.poll():
            pipe.recv()
            pipe.send(f"{(event.y - originY) * metersPerPixel}, {(event.x - originX) * metersPerPixel}")

    image: Image.Image = Image.open(path)

    def coordsToImage(xWorld: float, yWorld: float) -> tuple[int, int]:
        return (round(xWorld / metersPerPixel) + originX, round(yWorld / metersPerPixel) + originY)
    
    nodes: list[Node] = []

    for node in dNodes:
        if int(node["buildingId"]) != building:
            continue

        if int(node["id"]) == building:
            continue

        if ((not "floor" in node) and (building != -1)) or (building != -1 and int(node["floor"]) != floor):
            continue

        x, y = coordsToImage(float(node["x"]), float(node["y"]))
        nodes.append(Node(x, y, int(node["id"]), node["name"]))

    for edge in dEdges:
        first = [n for n in nodes if n.id == int(edge["startNodeId"])]
        last = [n for n in nodes if n.id == int(edge["endNodeId"])]

        if len(first) == 0 or len(last) == 0:
            continue

        first[0].connected.add(last[0])

    draw = ImageDraw.Draw(image)

    for node in nodes:
        for other in node.connected:
            draw.line((node.x, node.y, other.x, other.y), "red", 1)
    
    font = ImageFont.truetype("arial", 8)

    for node in nodes:
        r = 1 if node.name.startswith("~") else 2
        draw.ellipse((node.x - r, node.y - r, node.x + r, node.y + r), "gray" if node.name.startswith("~") else "blue")
        if node.name != "":
            #draw.text((node.x + 2, node.y - 4), node.name, fill="blue", font=font)
            pass

    root = tk.Tk()
    root.title(f"{building} floor {floor}")

    root.bind("<Button-1>", handleClick)
    root.protocol("WM_DELETE_WINDOW", lambda: exitWindow(root))

    tkImage = ImageTk.PhotoImage(image)

    image_label = tk.Label(root, image=tkImage)
    image_label.image = tkImage

    image_label.pack(padx=10, pady=10)

    root.mainloop()

def isShowing() -> bool:
    return hasWindow


if __name__ == "__main__":
    main()