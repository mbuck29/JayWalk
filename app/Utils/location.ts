import * as Location from 'expo-location';

export function watchLocation(callback: Location.LocationCallback, errorHandler: Location.LocationErrorCallback)
{
    Location.watchPositionAsync({accuracy: Location.LocationAccuracy.BestForNavigation, distanceInterval: 1},
                                callback,
                                errorHandler
                                );
}