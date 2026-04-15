import { Route } from "@/app/Utils/routing";
import { sanitize, stringifyRoute } from "@/app/Utils/routingUtils";
import type { PayloadAction } from "@reduxjs/toolkit";
import { configureStore, createSlice } from "@reduxjs/toolkit";
import type { TypedUseSelectorHook } from "react-redux";
import { useDispatch, useSelector } from "react-redux";

type JayWalkState = {
  route: Route | null;
  accessible: boolean;
  indoors: "indoors" | "outdoors" | "";
  start: string;
  currentNode: number;
  destination: string;
  destinationIds: number[];
  selectedFeatures: string[];
};

const initialState: JayWalkState = {
  route: null,
  accessible: false,
  indoors: "",
  start: "",
  currentNode: 0,
  destination: "",
  destinationIds: [],
  selectedFeatures: [],
};

const appSlice = createSlice({
  name: "jayWalk",
  initialState,
  reducers: {
    setRoute(state: JayWalkState, action: PayloadAction<Route>) {
      state.route = sanitize(action.payload);

      console.log(stringifyRoute(state.route));
      console.log(
        state.route.directions.map((dir) => dir.direction).join("\n"),
      );

      console.log(
        state.route == null
          ? "Cleared the route"
          : "Starting a new route from " +
              state.route.stops[0].name +
              " to " +
              state.route.stops[state.route.stops.length - 1].name,
      );
    },
    clearRoute(state: JayWalkState) {
      state.route = null;
      state.currentNode = 0;
      console.log("Cleared the route");
    },
    setAccessiblePreference(
      state: JayWalkState,
      payload: PayloadAction<boolean>,
    ) {
      state.accessible = payload.payload;
    },
    setIndoorOutdoorPreference(
      state: JayWalkState,
      payload: PayloadAction<"indoors" | "outdoors" | "">,
    ) {
      state.indoors = payload.payload;
    },
    setCurrentNode(state: JayWalkState, payload: PayloadAction<number>) {
      state.currentNode = payload.payload;
    },
    setStart(state: JayWalkState, payload: PayloadAction<string>) {
      state.start = payload.payload;
    },
    setDestination(state: JayWalkState, payload: PayloadAction<{text: string, ids: number[]}>) {
      state.destination = payload.payload.text;
      state.destinationIds = payload.payload.ids;
    },
    addToSelectedFeatures(state: JayWalkState, payload: PayloadAction<string>) {
      if (!state.selectedFeatures.includes(payload.payload)) {
        state.selectedFeatures.push(payload.payload);
      }
    },
    removeFromSelectedFeatures(
      state: JayWalkState,
      payload: PayloadAction<string>,
    ) {
      state.selectedFeatures = state.selectedFeatures.filter(
        (feature) => feature !== payload.payload,
      );
    },
    clearSelectedFeatures(state: JayWalkState) {
      state.selectedFeatures = [];
    },
  },
});

export const {
  setRoute,
  clearRoute,
  setAccessiblePreference,
  setIndoorOutdoorPreference,
  setCurrentNode,
  setStart,
  setDestination,
  removeFromSelectedFeatures,
  addToSelectedFeatures,
  clearSelectedFeatures,
} = appSlice.actions;

export const store = configureStore({
  reducer: {
    jayWalk: appSlice.reducer,
  },
});

export type { JayWalkState };
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default appSlice.reducer;
