/**
 * File: BottomPane.tsx
 * Purpose: A bottom pane that can be swiped up and down.
 * Author: C. Cooper
 * Date Created: 2026-04-21
 * Date Modified: 2026-04-21
 */

import { PropsWithChildren } from "react";
import { StyleSheet } from "react-native";
import
{
    Gesture,
    GestureDetector
} from "react-native-gesture-handler";
import Animated, {
    useAnimatedStyle,
    useSharedValue
} from "react-native-reanimated";

interface PanViewParams
{

}

export default function PanView({ children, }: PropsWithChildren<PanViewParams>)
{
    const offsetX = useSharedValue<number>(0);
    const offsetY = useSharedValue<number>(0);
    const panX = useSharedValue<number>(0);
    const panY = useSharedValue<number>(0);

    const animatedStyle = useAnimatedStyle(() =>
    {
        return {
            transform: [
                {
                    translateY: offsetY.value + panY.value,
                },
                {
                    translateX: offsetX.value + panX.value
                }
            ],
        };
    });

    const pan = Gesture.Pan()
        .onChange((event) =>
        {
            panX.value = event.translationX;
            panY.value = event.translationY;
        })
        .onFinalize(() =>
        {
            offsetX.value = panX.value + offsetX.value;
            offsetY.value = panY.value + offsetY.value;
            panX.value = 0;
            panY.value = 0;
        });

    return (
        <GestureDetector gesture={pan}>
            <Animated.View style={[animatedStyle, styles.holder]}>
                {children}
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    holder: {
        justifyContent: "flex-start",
        alignContent: "flex-start"
    }
});
