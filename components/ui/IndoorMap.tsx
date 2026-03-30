/**
 * File: IndoorMap.tsx
 * Purpose: Display the user's progress while indoors
 * Author: C. Cooper
 * Date Created: 2026-03-29
 * Date Modified: 2026-03-29
 */

import { getState } from "@/app/Utils/state";
import { buildingData } from "@/maps/data";
import { mapImages } from "@/maps/maps";
import ReactNativeZoomableView from '@openspacelabs/react-native-zoomable-view/src/ReactNativeZoomableView';
import { useState } from "react";
import { Dimensions, Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Polyline } from 'react-native-svg';


export default function IndoorMap()
{
    const state = getState();

    const [imageWidth, setImageWidth] = useState(0);
    const [imageHeight, setImageHeight] = useState(0);

    function handleLayout(event: LayoutChangeEvent)
    {
        setImageWidth(event.nativeEvent.layout.width);
        setImageHeight(event.nativeEvent.layout.height);
    }

    /*
     * Check that we are indoors and have a route
     */
    if(!state.route)
    {
        return;
    }

    const route = state.route;

    if(state.currentNode < 0)
    {
        return;
    }

    const currentNode = route.stops[state.currentNode];

    if(!currentNode.building)
    {
        return;
    }

    const floor = currentNode.floor;

    const buildingId = currentNode.building.id;

    let currentBuildingData = null;

    for(const b of buildingData)
    {
        if(b.nodeId == buildingId)
        {
            currentBuildingData = b;
            break;
        }
    }

    if(!currentBuildingData)
    {
        return;
    }

    const floorData = currentBuildingData.floors[currentNode.floor.toString()];

    if(!floorData)
    {
        return;
    }

    const mapPath = mapImages[`${currentBuildingData.name}${currentNode.floor}`];
    const { width, height } = Image.resolveAssetSource(mapPath);

    // Function to go from map coordinates to display coordinates
    function translatePoint(xWorld: number, yWorld: number): number[]
    {
        return [
            Math.round(imageWidth * (Math.round(xWorld / floorData.metersPerPixel) + floorData.originPixelX) / width),
            Math.round(imageHeight * (Math.round(yWorld / floorData.metersPerPixel) + floorData.originPixelY) / height)
        ];
    }

    // Make the lines we should draw on the map
    function genMapLines()
    {
        let start = state.currentNode;

        // Find the start of this indoor section
        for(; start >= 0; start--)
        {
            const otherNode = route.stops[start];

            if(otherNode.building?.id != buildingId || otherNode.floor !== floor)
            {
                break;
            }
        }

        start++;

        let points = [];

        // Add every point until the end of this indoor section
        for(let i = start; i < route.stops.length; i++)
        {
            const stop = route.stops[i];

            console.log(stop.name);

            if(stop.building?.id != buildingId || stop.floor != floor)
            {
                break;
            }

            points.push(translatePoint(stop.x, stop.y));
        }

        //console.log(points.map(p => `${p[0]},${p[1]}`).join(" "));

        for(let i = 0; i < 10; i++)
        {
            for(let j = 0; j < 10; j++)
            {
                //points.push([i * 100, j * 100])
            }
        }

        return <Polyline 
                    points={points.map(p => `${p[0]},${p[1]}`).join(" ")}
                    fill="none"
                    stroke="red"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
    }

    const windowWidth = Dimensions.get('window').width;
    const windowHeight = Dimensions.get('window').height;

    const currentPos = translatePoint(currentNode.x, currentNode.y);

    const lines = genMapLines();

    return (
    <View
            style={{
                width: windowWidth,
                height: windowHeight / 3.5
            }}>
        <ReactNativeZoomableView
            maxZoom={3}
            minZoom={0.25}
            initialZoom={0.5}
            movementSensibility={1.9}
            panBoundaryPadding={10000}
        >
        <View>
        <Image 
        source={mapPath}
        style={{
                alignSelf: "center"
            }}
        onLayout={handleLayout}
        />
        <Svg style={StyleSheet.absoluteFill}>
                {lines}
        </Svg>
        {/*<Image 
        source={require("../../assets/images/JayWalk-Logo1.png")}
        style={{
                alignSelf: "center",
                position: "absolute",
                width: 32
            }}
        resizeMode="contain" // Ensures the whole image is visible within the container
        onLayout={handleLayout}
        />*/}
        </View>
        
      </ReactNativeZoomableView>
    </View>
    );
}