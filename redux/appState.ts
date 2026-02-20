import { Route } from "@/app/Utils/routing";
import { sanitize, stringifyRoute } from "@/app/Utils/routingUtils";
import type { PayloadAction } from "@reduxjs/toolkit";
import { configureStore, createSlice } from "@reduxjs/toolkit";
import type { TypedUseSelectorHook } from "react-redux";
import { useDispatch, useSelector } from "react-redux";

type JayWalkState = {
    route: Route | null,
    accessible: boolean,
    indoors: "indoors" | "outdoors" | ""
};

const initialState: JayWalkState = {
  route: null,
  accessible: false,
  indoors: ""
};

const appSlice = createSlice({
  name: "jayWalk",
  initialState,
  reducers: {
    setRoute(state: JayWalkState, action: PayloadAction<Route>) {

      state.route = sanitize(action.payload);

      console.log(stringifyRoute(state.route));
      console.log(state.route.directions.map(dir => dir.direction).join("\n"));

      console.log(state.route == null ? "Cleared the route" : "Starting a new route from " + state.route.stops[0].name + " to " + state.route.stops[state.route.stops.length - 1].name);
    },
    clearRoute(state: JayWalkState)
    {
      state.route = null;
      console.log("Cleared the route");
    },
    setAccessiblePreference(state: JayWalkState, payload: PayloadAction<boolean>)
    {
      state.accessible = payload.payload;
    },
    setIndoorOutdoorPreference(state: JayWalkState, payload: PayloadAction<"indoors" | "outdoors" | "">)
    {
      state.indoors = payload.payload;
    }
  },
});

export const {
  setRoute,
  clearRoute,
  setAccessiblePreference,
  setIndoorOutdoorPreference
} = appSlice.actions;

export const store = configureStore({
  reducer: {
    jayWalk: appSlice.reducer
  },
});

export type { JayWalkState };
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default appSlice.reducer;