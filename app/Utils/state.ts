/**
 * File: state.ts
 * Purpose: A set of utility functions for accessing the app state
 * Author: C. Cooper
 * Date Created: 2026-02-10
 */

import { JayWalkState, useAppSelector } from "@/redux/appState";
import { Route } from "./routing";

/**
 * Gets the global state of the app.
 * This must be called from within a function component that is a subcomponent of one of the tabs.
 * @returns The 
 */
export function getState(): JayWalkState
{
    return useAppSelector((state) => state.jayWalk);
}

/**
 * Gets the route the user is currently navigating.
 * @param state The app's global state. Does not need to be passed if called from a function component that is a subcomponent of one of the tabs.
 * @returns The Route object, or null if the user is not currently navigating.
 */
export function getRoute(state: JayWalkState | undefined): Route | null
{
    state = state ?? getState();
    return state.route;
}

/**
 * Gets whether the user has a preference for accessible routes.
 * @param state The app's global state. Does not need to be passed if called from a function component that is a subcomponent of one of the tabs.
 * @returns True if the user requires accessible routes or false otherwise.
 */
export function getAccessiblePreference(state: JayWalkState | undefined): boolean
{
    state = state ?? getState();
    return state.accessible;
}

/**
 * Gets the user's indoor/outdoor route preference.
 * @param state The app's global state. Does not need to be passed if called from a function component that is a subcomponent of one of the tabs.
 * @returns "indoors" of the user prefers indoor routes, "outdoors" if they prefer outdoor routes, and "" if they have no preference.
 */
export function getIndoorOutdoorPreference(state: JayWalkState | undefined): "indoors" | "outdoors" | ""
{
    state = state ?? getState();
    return state.indoors;
}