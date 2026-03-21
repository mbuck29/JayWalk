import { route } from "@/app/Utils/routing";
import { graph, Node } from "@/maps/graph";
import {
  clearRoute,
  setRoute,
  useAppDispatch,
  useAppSelector,
} from "@/redux/appState";
import { navigate } from "expo-router/build/global-state/routing";
import React, { useEffect, useRef, useState } from "react";
import {
  TextInput as RNTextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { TextInput } from "react-native-paper";
import { sanitize } from "../../app/Utils/routingUtils";
import LocationMenu from "./LocationMenu";

interface ReroutePromptProps {
  isManualReroute: boolean;
  setShowReroutePrompt: (x: boolean) => void;
  setIsRouteStarted: (x: boolean) => void;
  isIndoors: boolean;
}

export default function ReroutePrompt(props: ReroutePromptProps) {
  const { isManualReroute, setShowReroutePrompt, setIsRouteStarted } = props;
  const dispatch = useAppDispatch();
  const state = useAppSelector((state) => state.jayWalk);
  const [isSearching, setIsSearching] = useState(false); // we have multiple "screens" so this is to know if the user is looking at the search screen

  // all the stuff needed to handle the searching and starting a new route
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [newStartText, setNewStartText] = useState("");
  const [originalStart, setOriginalStart] = useState<Node | null>(null);
  const [newStart, setNewStart] = useState<Node | null>(null);
  const [destNode, setDestNode] = useState<Node | null>(null);
  const newStartLocRef = useRef<RNTextInput | null>(null);
  const rerouteMessage = isSearching
    ? "Where is your new starting location"
    : isManualReroute
      ? "Would you like to reroute from your current postion"
      : "You have left the designated path, would you like to reroute from your current postion";
  const secondaryButtonTitle = isSearching
    ? "end"
    : isManualReroute
      ? "no"
      : "end route";

  // To correctly reroute the user we need to know the original nodes that the user was using as the start and
  // dest. So this use effect runs one time on mount so that we can grab those nodes from the graph
  useEffect(() => {
    graph.nodes.forEach((node) => {
      if (node.name === state.destination) {
        setDestNode(node);
      }
      if (node.name === state.start) {
        setOriginalStart(node);
      }
    });
  }, []);

  // The primary button(the one on the right) handles progressing to rerouting from the issue we foudn or the user
  // was having
  function handlePrimaryButtonPress() {
    if (!isSearching) {
      // if we are on the default "screen" of the prompt then we just set is searching
      setIsSearching(true);

      // If we are searching we need to handle rerouting correctly
    } else {
      if (newStart && destNode) {
        // we need to make sure they have a valid start and dest then route them
        const newRoute = route(state, newStart, destNode);
        if (!newRoute) {
          // if we couldnt find a route we will just kick them to the main screen
          dispatch(clearRoute());
          console.log("No route found!");
          return;
        }

        // If we could find a route we will reset the routing state to the new route
        dispatch(setRoute(sanitize(newRoute)));
        setShowReroutePrompt(false);
        setIsRouteStarted(false);
      }
    }
  }

  // The prompt has two buttons, the secondary button(the one on the left) has two functionallity.
  function handleSecondaryButtonPress() {
    setShowReroutePrompt(false); // No matter if manual or not it will close the prompt

    // If it is manual that means the user has left the path and so if they dont reroute with the primary
    // we will end the route and put them into the main screen cause we cant give them accurate directions
    if (!isManualReroute) {
      setIsRouteStarted(false);
      dispatch(clearRoute()); // Clear the route from the state when ending the route
      navigate("/(tabs)");
    }
  }

  return (
    <View style={styles.PromptContainer}>
      <Text style={styles.messageText}>{rerouteMessage}</Text>
      {isSearching && (
        <LocationMenu
          visible={isMenuVisible} // We only want to show the menu
          //when the user is actively using the text field
          onDismiss={() => setIsMenuVisible(false)}
          oppisiteValue={destNode}
          currentStartValue={originalStart}
          anchor={
            // The location menu needs something to anchor it, so that it knows where to appear. In this case we anchor it to the text input for the current location.
            //current location box
            <TextInput
              ref={newStartLocRef}
              value={newStartText}
              activeUnderlineColor="transparent"
              activeOutlineColor="#356EC4"
              underlineColor="transparent"
              textColor="#356EC4"
              mode="outlined"
              theme={{ roundness: 44 }}
              outlineColor="transparent"
              onChangeText={setNewStartText}
              style={{
                backgroundColor: "#C2DCF0",
                borderRadius: 44,
                borderTopEndRadius: 44,
                borderTopStartRadius: 44,
                height: 68,
                width: 316,
                paddingHorizontal: 16,
                justifyContent: "center",
                fontSize: 18,
              }}
              contentStyle={{
                fontFamily: "OrelegaOne",
              }}
              onFocus={() => setIsMenuVisible(true)} // When the user focuses on the text input we want to show the menu so that they can select there location from the list of options.
              onChange={() => setIsMenuVisible(true)}
            />
          }
          options={graph.nodes} // They are selecting from the nodes so we pass them here
          // We pass the current text in the text field to the menu so that it can filter the options based on what the user has typed.
          // This makes it easier for the user to find there location. We also pass the set function so when they select something we can set it as there choice
          locationText={newStartText}
          setLocation={setNewStart}
          setLocationText={setNewStartText}
          onSelect={() => newStartLocRef.current?.blur()}
        />
      )}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSecondaryButtonPress}
        >
          <Text style={styles.buttonText}>{secondaryButtonTitle}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePrimaryButtonPress}
          style={styles.rerouteButton}
        >
          <Text style={styles.buttonText}>Reroute</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  PromptContainer: {
    borderRadius: 44,
    backgroundColor: "#fff",
    position: "absolute",
    width: "80%",
    paddingTop: 28,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 18,
    top: "40%",
    left: "10%",
    zIndex: 100,
  },
  messageText: {
    fontFamily: "OrelegaOne",
    color: "#000",
  },
  buttonContainer: {
    justifyContent: "flex-end",
    flexDirection: "row",
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: "#C2DCF0",
    padding: 8,
    borderRadius: 12,
  },
  rerouteButton: {
    backgroundColor: "#C42514",
    padding: 8,
    borderRadius: 12,
  },
  buttonText: {
    fontFamily: "OrelegaOne",
    color: "#fff",
  },
});
