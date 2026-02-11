import { Edge, Node } from "@/maps/graph";
import { JayWalkState } from "@/redux/appState";
import { edgeOther } from "./routingUtils";
import { getAccessiblePreference, getIndoorOutdoorPreference } from "./state";

export interface Route
{
    route: Edge[],
    stops: Node[]
}

export function route(state: JayWalkState, start: Node, end: Node): Route | null
{
    if(start == end)
    {
        return {route: [], stops: [start]};
    }

    const accessibleOnly = getAccessiblePreference(state);
    const inOutPreference = getIndoorOutdoorPreference(state);

    const edgeMap: Record<number, Edge> = {};
    const done: Set<number> = new Set();

    done.add(start.id);

    const heap = new Heap();

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
        const distance = heap.getRootKey();
        const current = heap.pop();

        if(current == null) // Can never happen but necessary for typing
        {
            return null;
        }

        done.add(current.id);

        if(current == end)
        {
            break;
        }

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

            if(done.has(next.id))
            {
                continue;
            }

            if(!heap.has(next))
            {
                heap.add(next, distance + addDistance);
                edgeMap[next.id] = edge;
            }

            if(heap.getKey(next) <= distance + addDistance)
            {
                continue;
            }

            heap.reduceKey(next, distance + addDistance);
            edgeMap[next.id] = edge;
        }
    }

    if(!done.has(end.id))
    {
        return null;
    }

    const outEdges: Edge[] = [];
    const outNodes: Node[] = [];

    let current = end;

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

function getBaseLength(edge: Edge)
{
    if(edge.indoors)
    {
        return edge.length;
    }

    return Math.sqrt(Math.pow(edge.startNode.x - edge.endNode.x, 2) + Math.pow(edge.startNode.y - edge.endNode.y, 2)) * (edge.type == "stairs" ? 1.5 : 1) * 0.000009;
}

interface HeapNode
{
    index: number,
    key: number,
    value: Node
}

class Heap
{
    heap: HeapNode[] = []
    nodeMap: Record<number, HeapNode> = {}

    public add(node: Node, value: number)
    {
        const newNode = {
            index: this.heap.length,
            key: value,
            value: node
        }

        this.nodeMap[node.id] = newNode;

        this.heap.push(newNode);
        this.upHeap(newNode);
    }

    public getRootKey(): number
    {
        return this.heap.length == 0 ? -1 : this.heap[0].key;
    }

    public getKey(node: Node): number
    {
        if(!this.has(node))
        {
            return -1;
        }

        const heapNode = this.nodeMap[node.id];
        
        return heapNode.key;
    }

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

    public has(node: Node): boolean
    {
        return node.id in this.nodeMap;
    }

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
    
    public isEmpty(): boolean
    {
        return this.heap.length == 0;
    }

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

    private swap(a: HeapNode, b: HeapNode)
    {
        const aIndex = a.index;
        a.index = b.index;
        b.index = aIndex;
        this.heap[a.index] = a;
        this.heap[aIndex] = b;
    }

    static parent(index: number): number
    {
        return (index - 1) >> 1
    }

    static left(index: number): number
    {
        return (index << 1) + 1
    }

    static right(index: number): number
    {
        return (index << 1) + 2
    }
}