/**
 * File: PanView.tsx
 * Purpose: A view that allows zooming and panning of its contents
 * Author: C. Cooper
 * Date Created: 2026-04-25
 * Date Modified: 2026-04-25
 */

import { PropsWithChildren, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
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
    childWidth: number,
    childHeight: number;
}

export default function PanView({ childHeight, childWidth, children, }: PropsWithChildren<PanViewParams>)
{
    const offsetX = useSharedValue<number>(0);
    const offsetY = useSharedValue<number>(0);
    const panX = useSharedValue<number>(0);
    const panY = useSharedValue<number>(0);

    const scale = useSharedValue(1);
    const pinchScale = useSharedValue(1);

    const [viewHeight, setViewHeight] = useState(0);
    const [viewWidth, setViewWidth] = useState(0);

    const handleHolderLayout = (event: LayoutChangeEvent) =>
    {
        setViewHeight(event.nativeEvent.layout.height);
        setViewWidth(event.nativeEvent.layout.width);
    };

    // The anumation to make the contents zoom/pan
    const animatedStyle = useAnimatedStyle(() =>
    {
        return {
            transform: [
                {
                    scale: pinchScale.value
                },
                {
                    translateY: offsetY.value + panY.value,
                },
                {
                    translateX: offsetX.value + panX.value
                }
            ],
        };
    });

    // What to do when the user pinches the view
    const pinch = Gesture.Pinch()
        .onUpdate((e) =>
        {
            pinchScale.value = scale.value * e.scale;
        })
        .onEnd(() =>
        {
            scale.value = pinchScale.value;
        });

    // What to do when the user pans the view
    const pan = Gesture.Pan()
        .onChange((event) =>
        {
            let pX = offsetX.value + event.translationX / pinchScale.value;
            let pY = offsetY.value + event.translationY / pinchScale.value;

            /*
            if(pX < (-childWidth + viewWidth) * pinchScale.value)
            {
                pX = (-childWidth + viewWidth) * pinchScale.value;
            }
            else if(pX > 0)
            {
                pX = 0;
            }
 
            if(pY < (-childHeight + viewHeight) * pinchScale.value)
            {
                pY = (-childHeight + viewHeight) * pinchScale.value;
            }
            else if(pY > 0)
            {
                pY = 0;
            }*/

            panX.value = pX - offsetX.value;
            panY.value = pY - offsetY.value;
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
            <GestureDetector gesture={pinch}>
                <Animated.View style={[animatedStyle, styles.holder]} onLayout={handleHolderLayout}>
                    <View style={styles.childs}>
                        {children}
                    </View>
                </Animated.View>
            </GestureDetector>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    holder: {
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        width: "100%",
        height: "100%",
        maxWidth: "100%",
        maxHeight: "100%"
    },
    childs: {
        width: "auto",
        height: "auto",
        maxHeight: 1000000,
        maxWidth: 10000000
    }
});
