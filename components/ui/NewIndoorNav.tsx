import { useAppState } from "@/app/Utils/state";
import Arrow from "@/assets/images/icons/Misc/arrow.svg";
import { setCurrentNode, useAppDispatch } from "@/redux/appState";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, useColorScheme, useWindowDimensions, View } from "react-native";
import BottomPane from "./BottomPane";
import IndoorDirection from "./IndoorDirection";
import IndoorMap from "./IndoorMap";

export default function NewIndoorNav()
{
    const BOTTOM_OFFSET_HIGH_HIGH = -0.35;
    const BOTTOM_OFFSET_HIGH = -0.27;
    const BOTTOM_OFFSET_LOW = 0.5;

    const state = useAppState();
    const currentNodeIndex = state.currentNode;
    const dispatch = useAppDispatch();

    const darkMode = useColorScheme() == "dark";

    const [currentDirectionIndex, setCurrentDirectionIndex] = useState(0);

    const [bottomPanePosition, setBottomPanePosition] = useState<"low" | "mid" | "high">("low");

    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const route = state.route;

    const directions = route?.directions ?? [];

    function changeDirectionIndex(index: number)
    {
        dispatch(setCurrentNode(directions[index].node));
        setCurrentDirectionIndex(index);
    }

    useEffect(() =>
    {
        if(directions.length <= currentDirectionIndex)
        {
            return;
        }

        let index = currentDirectionIndex;

        while(currentNodeIndex > directions[index].node)
        {
            if(index >= directions.length - 1)
            {
                break;
            }

            index++;
        }

        setCurrentDirectionIndex(index);
    }, []);

    return (
        directions &&
        <View style={[styles.background, { backgroundColor: (darkMode ? "#0D1521" : "#FFF") }]}>
            <View style={[styles.header]}>
                <View style={[styles.headerLeft]}>
                    <View style={styles.symbolHolder}>
                        <Image
                            source={require("../../assets/images/JayWalk-Logo1.png")}
                            style={styles.symbolImage}
                            resizeMode="contain"
                        />
                    </View>
                    <View style={[styles.headerLeftStack]}>
                        <Text style={{ color: darkMode ? "#FFF" : "#000", fontSize: 13 }}>
                            INDOOR
                        </Text>
                        <Text style={{ color: "#5F88C9", fontSize: 20 }}>
                            Directions
                        </Text>
                    </View>

                </View>
                <TouchableOpacity onPress={() => setBottomPanePosition(bottomPanePosition == "low" ? "mid" : "low")} style={[styles.floorPlanButton, { backgroundColor: darkMode ? "#223252" : "#356EC4" }]}>
                    <Text style={{ color: darkMode ? "#5F88C9" : "#C2DCF0" }}>
                        FLOOR PLAN
                    </Text>
                </TouchableOpacity>
            </View>
            <View style={[styles.directionsBlock]}>
                {directions.map((dir, i) =>
                    <View style={styles.directionHolder} key={"direction " + i.toString()}>
                        <IndoorDirection direction={dir} displayIndex={i - currentDirectionIndex} offset={currentDirectionIndex} />
                    </View>
                )}
            </View>
            {/*<View style={[styles.footer]}>
                <View style={[styles.prevNextHolder, { borderRadius: 0.35 * 0.8 * 0.08 * screenHeight, backgroundColor: darkMode ? "#223252" : "#356EC4" }]}>
                    <TouchableOpacity style={[styles.prev, currentDirectionIndex == 0 ? { opacity: 0.5, pointerEvents: "none" } : undefined]} onPress={() => changeDirectionIndex(currentDirectionIndex - 1 >= 0 ? currentDirectionIndex - 1 : 0)}>
                        <View style={[styles.symbolHolder]}>
                            <Arrow style={[styles.symbolImage, { transform: [{ rotate: "-90deg" }] }]}></Arrow>
                        </View>

                        <Text style={{ color: "#FFF" }}>
                            Previous
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.next, currentDirectionIndex == directions.length - 1 ? { opacity: 0.5, pointerEvents: "none" } : undefined]} onPress={() => changeDirectionIndex(currentDirectionIndex + 1 < directions.length ? currentDirectionIndex + 1 : currentDirectionIndex)}>
                        <Text style={{ color: "#FFF" }}>
                            Next
                        </Text>

                        <View style={[styles.symbolHolder]}>
                            <Arrow style={[styles.symbolImage, { transform: [{ rotate: "90deg" }] }]}></Arrow>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>*/}
            {<Footer leftPress={() => changeDirectionIndex(currentDirectionIndex - 1 >= 0 ? currentDirectionIndex - 1 : 0)} rightPress={() => changeDirectionIndex(currentDirectionIndex + 1 < directions.length ? currentDirectionIndex + 1 : currentDirectionIndex)} currentDirectionIndex={currentDirectionIndex} />/**/}

            <BottomPane
                position={bottomPanePosition}
                setPosition={setBottomPanePosition}
                lowPosition={BOTTOM_OFFSET_LOW * screenHeight}
                midPosition={0}
                highPosition={BOTTOM_OFFSET_HIGH * screenHeight}
                maxPosition={BOTTOM_OFFSET_HIGH_HIGH * screenHeight}
                minPosition={BOTTOM_OFFSET_LOW * screenHeight}
                allowScroll={false}
                hat={<Footer leftPress={() => changeDirectionIndex(currentDirectionIndex - 1 >= 0 ? currentDirectionIndex - 1 : 0)} rightPress={() => changeDirectionIndex(currentDirectionIndex + 1 < directions.length ? currentDirectionIndex + 1 : currentDirectionIndex)} currentDirectionIndex={currentDirectionIndex} />/**/}
            >
                <View style={{ height: "2%" }} />
                <Text style={{ color: darkMode ? "#FFF" : "#000", fontSize: 20 }}>
                    {route?.stops[currentNodeIndex].building?.name + " Floor " + route?.stops[currentNodeIndex].floor}
                </Text>
                <View style={{ height: "2%" }} />
                <IndoorMap />
            </BottomPane>

        </View>
    );
}

function Footer({ leftPress, rightPress, currentDirectionIndex }: { leftPress: () => void, rightPress: () => void, currentDirectionIndex: number; })
{
    const state = useAppState();
    const directions = state.route?.directions;
    const darkMode = useColorScheme() == "dark";

    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    return (
        <View style={[styles.footer, { height: 0.08 * screenHeight }]}>
            <View style={[styles.prevNextHolder, { borderRadius: 0.35 * 0.8 * 0.08 * screenHeight, backgroundColor: darkMode ? "#223252" : "#356EC4" }]}>
                <TouchableOpacity style={[styles.prev, currentDirectionIndex == 0 ? { opacity: 0.5, pointerEvents: "none" } : undefined]} onPress={leftPress}>
                    <View style={[styles.symbolHolder]}>
                        <Arrow style={[styles.symbolImage, { transform: [{ rotate: "-90deg" }] }]}></Arrow>
                    </View>

                    <Text style={{ color: "#FFF" }}>
                        Previous
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.next, currentDirectionIndex == (directions?.length ?? 1) - 1 ? { opacity: 0.5, pointerEvents: "none" } : undefined]} onPress={rightPress}>
                    <Text style={{ color: "#FFF" }}>
                        Next
                    </Text>

                    <View style={[styles.symbolHolder]}>
                        <Arrow style={[styles.symbolImage, { transform: [{ rotate: "90deg" }] }]}></Arrow>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    background: {
        display: "flex",
        flex: 1,
        flexDirection: "column",
        justifyContent: "flex-start",
        height: "100%",
        width: "100%",
        gap: "2%"
    },
    header: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        width: "100%",
        height: "10%",
        maxHeight: "10%",
        paddingTop: "10%",
        paddingBottom: "0%",
        paddingHorizontal: "4%"
    },
    headerLeft: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        height: "100%",
        maxHeight: "100%"
    },
    headerLeftStack: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "flex-start",
        height: "100%",
        maxHeight: "100%"
    },
    floorPlanButton: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height: "80%",
        borderRadius: 999999,
        paddingHorizontal: "5%"
    },
    directionsBlock: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        height: "75%",
        width: "100%",
        gap: "3%"
    },
    directionHolder: {
        maxWidth: "85%",
        maxHeight: "12%",
        width: "85%",
        height: "12%",
    },
    footer: {
        alignSelf: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "8%",
        width: "100%"
    },
    prevNextHolder: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        height: "80%",
        width: "75%",
        maxHeight: "80%",
        overflow: "hidden"
    },
    prev: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        maxHeight: "100%",
        height: "100%",
    },
    next: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end"
    },
    symbolImage: {
        maxHeight: "80%",
        aspectRatio: "1/1",
        height: "80%",
    },
    symbolHolder: {
        maxHeight: "100%",
        height: "100%",
        aspectRatio: "1/1",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
});