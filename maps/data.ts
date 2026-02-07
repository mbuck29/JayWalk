export interface DataEdge
{
    id: number,
    startNodeId: number,
    endNodeId: number,
    length: number
    type: string
    accessible: boolean
    indoors: boolean
}

export interface DataNode
{
    id: number,
    name: string,
    x: number,
    y: number,
    buildingId: number,
    edgeIds: number[]
}

export function getEdges()
{
    return require('./edges.json') as DataEdge[]
}

export function getNodes()
{
    return require('./nodes.json') as DataNode[]
}