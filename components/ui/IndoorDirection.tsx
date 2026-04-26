import { Direction } from "@/app/Utils/directions";
import { isDarkMode } from "@/app/Utils/ui";
import { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import DirectionSymbol from "./DirectionSymbol";

interface IndoorDirectionProps
{
    direction: Direction,
    displayIndex: number,
    offset: number;
}

export default function IndoorDirection({ direction, displayIndex, offset }: IndoorDirectionProps)
{
    const screenHeight = useWindowDimensions().height;
    const [height, setHeight] = useState(screenHeight * 0.1 * 0.75);

    const darkMode = isDarkMode();

    const handleLayout = (event: LayoutChangeEvent) =>
    {
        setHeight(event.nativeEvent.layout.height);
    };

    const backgroundOpacity = useSharedValue(displayIndex >= 0 && displayIndex < 5 ? 0.2 * (5 - displayIndex) : 0);
    const opacity = useSharedValue(displayIndex >= 0 && displayIndex < 5 ? 1 : 0);
    const translation = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() =>
    {
        return {
            opacity: opacity.value,
            transform: [{
                translateY: translation.value
            }],
            backgroundColor: `rgba(95, 136, 201, ${backgroundOpacity.value})`
        };
    });

    useEffect(() =>
    {
        if(displayIndex >= 5 || displayIndex < 0)
        {
            opacity.value = withTiming(displayIndex < 0 ? 0 : displayIndex < 7 ? 0.5 : 0, { duration: 500 });
            if(displayIndex >= 5)
            {
                backgroundOpacity.value = withTiming(0.1, { duration: 250 });
            }
        }
        else
        {
            opacity.value = withTiming(1, { duration: 1000 });
            backgroundOpacity.value = withTiming((5 - displayIndex) * 0.2, { duration: 250 });
        }

        const newTranslation = -height * offset * 15 / 12;
        const time = 250; // 200 * 10 * Math.abs(newTranslation - translation.value) / screenHeight;

        translation.value = withTiming(newTranslation, { duration: time });

    }, [displayIndex]);





    return (
        <Animated.View style={[styles.background, { borderRadius: 0.35 * height }, animatedStyle]} onLayout={handleLayout}>
            <View style={[styles.symbolHolder]}>
                <DirectionSymbol direction={direction} />
            </View>
            <Text style={[styles.text, { color: darkMode ? "#FFF" : "#000" }]}>{direction.direction}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    background: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        maxHeight: "100%",
        maxWidth: "100%",
        height: "100%",
        width: "100%",
        paddingLeft: "5%",
        gap: "5%",
    },
    symbolImage: {
        opacity: 1,
        maxHeight: "80%",
        aspectRatio: "1/1",
        height: "80%"
    },
    symbolHolder: {
        maxHeight: "57%",
        height: "57%",
        aspectRatio: "1/1",
        borderRadius: "50%",
        backgroundColor: "#1E2E4580",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    text: {
        opacity: 1,
        flexShrink: 1
    }
});