/**
 * File: routing.ts
 * Purpose: Implement an algorithm to find the shortest path between two nodes on the JayWalk graph
 * Author: C. Cooper
 * Date Created: 2026-02-10
 */

import { Edge, Node } from "@/maps/graph";
import { JayWalkState } from "@/redux/appState";
import { edgeOther } from "./routingUtils";
import { getAccessiblePreference, getIndoorOutdoorPreference } from "./state";

// Values for 38.598 degrees latitude calculated using https://www.starpath.com/calc/Distance%20Calculators/degree.html
const METERS_PER_DEGREE_LAT = 111008
const METERS_PER_DEGREE_LONG = 87114

/**
 * The route that a user should take
 */
export interface Route
{
    /** The edges that the user should follow */
    route: Edge[],
    /** The stops the user should visit along the route */
    stops: Node[]
}

/**
 * Finds the shortest path between the two given nodes in the campus graph.
 * @param state The global state of the application. Not strictly necessary if calling from a component.
 * @param start The node to start routing from.
 * @param end The node to route to.
 * @returns A Route object representing the route to take, or null if the two nodes are not connected.
 */
export function route(state: JayWalkState, start: Node, end: Node): Route | null
{
    // This is an impmlementaiton of Dijkstra's algorithm

    // Trivial case if start and end are the same
    if(start == end)
    {
        return {route: [], stops: [start]};
    }

    // Get the user-selected route preferences
    const accessibleOnly = getAccessiblePreference(state);
    const inOutPreference = getIndoorOutdoorPreference(state);

    // A node id -> the last edge before that node in the shortest path map, for the traceback
    const edgeMap: Record<number, Edge> = {};

    // The set of ids of the edges that have been completed thus far
    const done: Set<number> = new Set();
    
    done.add(start.id);

    // Heap for the closest nodes thus far
    const heap = new Heap();

    // Add all of the nodes connected directly to the start node to the heap
    for(const edge of start.edges)
    {
        if(accessibleOnly && !edge.accessible)
        {
            continue;
        }

        let distance = getBaseLength(edge);

        // Punish not taking an indoor/outdoor route if they have a preference
        if(inOutPreference != "" && ((inOutPreference == "indoors") != edge.indoors))
        {
            distance += 1000;
        }
        
        const next = edgeOther(edge, start);
        heap.add(next, distance);
        edgeMap[next.id] = edge;
    }

    while(!heap.isEmpty())
    {
        // Get the distance to the nearest unfinished node, and the node itself
        const distance = heap.getRootKey();
        const current = heap.pop();

        if(current == null) // Can never happen but necessary for typing
        {
            return null;
        }

        // Mark that the current node has been solved
        done.add(current.id);

        // If we have solved the end node, we are done
        if(current == end)
        {
            console.log("Distance: " + distance + "m");
            break;
        }

        // See if any of the edges out of the current node make a new shortest path to any node
        for(const edge of current.edges)
        {
            if(accessibleOnly && !edge.accessible)
            {
                continue;
            }

            let addDistance = getBaseLength(edge);

            // Punish not taking an indoor/outdoor route if they have a preference
            if(inOutPreference != "" && ((inOutPreference == "indoors") != edge.indoors))
            {
                addDistance += 1000;
            }
            
            const next = edgeOther(edge, current);

            // If the other node on this edge is solved, skip it
            if(done.has(next.id))
            {
                continue;
            }

            // Add the other node to the heap if it isn't already there
            if(!heap.has(next))
            {
                heap.add(next, distance + addDistance);
                edgeMap[next.id] = edge;
                continue;
            }

            // If this edge doesn't improve the route distance, don't do anything
            if(heap.getKey(next) <= distance + addDistance)
            {
                continue;
            }

            // Update the route distance and mark the new previous edge
            heap.reduceKey(next, distance + addDistance);
            edgeMap[next.id] = edge;
        }
    }

    // If we didn't find a route to the end node, return null
    if(!done.has(end.id))
    {
        return null;
    }

    const outEdges: Edge[] = [];
    const outNodes: Node[] = [];

    let current = end;

    // Trace back the path to the end node and fill out the edge and node arrays
    while(current.id in edgeMap)
    {
        outNodes.push(current);
        const edge = edgeMap[current.id];
        outEdges.push(edge);
        current = edgeOther(edge, current);
    }

    outNodes.push(current);

    return {
        route: outEdges.reverse(),
        stops: outNodes.reverse()
    }
}

/**
 * Get the physical length of the given edge
 * @param edge The edge
 * @returns The physical length of the edge
 */
export function getBaseLength(edge: Edge)
{
    if(edge.indoors)
    {
        return edge.length;
    }

    // Calculate the length based on the end node coordinates, modifying it by *1.5 if it is stairs
    return Math.sqrt(Math.pow((edge.startNode.x - edge.endNode.x) * METERS_PER_DEGREE_LONG, 2) + Math.pow((edge.startNode.y - edge.endNode.y) * METERS_PER_DEGREE_LONG, 2)) * (edge.type == "stairs" ? 1.2 : 1);
}

/**
 * Node object for the heap data structure below
 */
interface HeapNode
{
    index: number,
    key: number,
    value: Node
}

/**
 * A basic min-heap
 * For the purposes of the algorithm, the keys are the distances to each node in the heap
 */
class Heap
{
    // The HeapNodes in the heap
    heap: HeapNode[] = []

    // A map from a Node's id to its HeapNode
    nodeMap: Record<number, HeapNode> = {}

    /**
     * Add the given node to the heap
     * @param node The Node to add
     * @param key The starting key of the node
     */
    public add(node: Node, key: number)
    {
        const newNode = {
            index: this.heap.length,
            key: key,
            value: node
        }

        this.nodeMap[node.id] = newNode;

        this.heap.push(newNode);
        this.upHeap(newNode);
    }

    /**
     * Gets the key of the root node
     * @returns The key of the root node, or -1 if there is no root
     */
    public getRootKey(): number
    {
        return this.heap.length == 0 ? -1 : this.heap[0].key;
    }

    /**
     * Gets the key associated with the given Node
     * @param node The Node to get the key of
     * @returns The key of (distance to) the given node
     */
    public getKey(node: Node): number
    {
        if(!this.has(node))
        {
            return -1;
        }

        const heapNode = this.nodeMap[node.id];
        
        return heapNode.key;
    }

    /**
     * Reduces the key of the given Node
     * @param node The Node to reduce the key of
     * @param value The value to reduce the key to
     */
    public reduceKey(node: Node, value: number)
    {
        if(!this.has(node))
        {
            return;
        }

        const heapNode = this.nodeMap[node.id];
        
        if(value < heapNode.key)
        {
            heapNode.key = value;
            this.upHeap(heapNode);
        }
    }

    /**
     * Checks whether the given Node is in the heap
     * @param node The Node to check for
     * @returns True if the Node is in the heap
     */
    public has(node: Node): boolean
    {
        return node.id in this.nodeMap;
    }

    /**
     * Pops the top Node off the heap and updates it accordingly
     * @returns The top Node on the heap, or null if the heap is empty
     */
    public pop(): Node | null
    {
        if(this.heap.length == 0)
        {
            return null;
        }

        if(this.heap.length == 1)
        {
            const root = this.heap[0];
            delete this.nodeMap[root.value.id];
            this.heap.pop();
            return root.value;
        }

        const root = this.heap[0];
        delete this.nodeMap[root.value.id];

        const end = this.heap[this.heap.length - 1];
        end.index = 0;
        this.heap.pop();
        this.heap[0] = end;

        this.downHeap(end);

        return root.value;
    }
    
    /**
     * Checks whether the heap is empty
     * @returns True if the heap is empty
     */
    public isEmpty(): boolean
    {
        return this.heap.length == 0;
    }

    /**
     * Upheaps (up-percolates) the given HeapNode
     * @param node The HeapNode to upheap
     */
    private upHeap(node: HeapNode)
    {
        while(node.index != 0)
        {
            const parentIndex = Heap.parent(node.index);

            const parentNode = this.heap[parentIndex];

            if(parentNode.key < node.key)
            {
                return;
            }

            this.swap(node, parentNode);
        }
    }

    /**
     * Downheaps (down-percolates) the given HeapNode
     * @param node The HeapNode to downheap
     */
    private downHeap(node: HeapNode)
    {
        while(true)
        {
            let l = Heap.left(node.index);

            if(l >= this.heap.length)
            {
                return;
            }

            let r = Heap.right(node.index);
            if(r >= this.heap.length)
            {
                if(this.heap[l].key > node.key)
                {
                    return;
                }

                this.swap(node, this.heap[l]);
                return;
            }

            const minIndex = this.heap[l].key < this.heap[r].key ? l : r;
            const min = this.heap[minIndex].key;

            if(min > node.key)
            {
                return;
            }

            this.swap(this.heap[minIndex], node);
        }
    }

    /**
     * Swaps the positions of the two given HeapNodes
     * @param a One HeapNode
     * @param b The other HeapNode
     */
    private swap(a: HeapNode, b: HeapNode)
    {
        const aIndex = a.index;
        a.index = b.index;
        b.index = aIndex;
        this.heap[a.index] = a;
        this.heap[aIndex] = b;
    }

    /**
     * Gets the index of the parent of the given index
     * @param index The index to get the parent of
     * @returns The index of the parent of the given index
     */
    private static parent(index: number): number
    {
        return (index - 1) >> 1
    }

    /**
     * Gets the index of the left child of the given index
     * @param index The index to get the left child of
     * @returns The index of the left child of the given index
     */
    private static left(index: number): number
    {
        return (index << 1) + 1
    }

    /**
     * Gets the index of the right child of the given index
     * @param index The index to get the right child of
     * @returns The index of the right child of the given index
     */
    private static right(index: number): number
    {
        return (index << 1) + 2
    }
}