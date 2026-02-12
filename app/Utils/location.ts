/**
 * File: location.ts
 * Purpose: A set of wrapper functions for the expo-location module
 * Author: C. Cooper
 * Date Created: 2026-02-03
 */

import * as Location from 'expo-location';

/**
 * Watch the user's live location with callbacks when the user's position changes by at least one meter
 * @param callback The function to call when the user's position changes
 * @param errorHandler The function to call if there is an error in the location module
 */
export function watchLocation(callback: Location.LocationCallback, errorHandler: Location.LocationErrorCallback)
{
    Location.watchPositionAsync({accuracy: Location.LocationAccuracy.BestForNavigation, distanceInterval: 1},
                                callback,
                                errorHandler
                                );
}