import { JayWalkState, useAppSelector } from "@/redux/appState";
import { Route } from "./routing";

export function getState(): JayWalkState
{
    return useAppSelector((state) => state.jayWalk);
}

export function getRoute(state: JayWalkState | undefined): Route | null
{
    state = state ?? getState();
    return state.route;
}

export function getAccessiblePreference(state: JayWalkState | undefined): boolean
{
    state = state ?? getState();
    return state.accessible;
}

export function getIndoorOutdoorPreference(state: JayWalkState | undefined): "indoors" | "outdoors" | ""
{
    state = state ?? getState();
    return state.indoors;
}