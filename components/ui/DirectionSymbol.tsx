import { Direction } from "@/app/Utils/directions";
import Pin from "@/assets/images/icons/Misc/arrived.svg";
import Arrow from "@/assets/images/icons/Misc/arrow.svg";
import { StyleSheet } from "react-native";

export default function DirectionSymbol({ direction }: { direction: Direction; })
{
    let symbol;

    switch(direction.directionType)
    {
        case "arrived":
            symbol = "pin";
            break;
        case "entering":
            symbol = "enter";
            break;
        case "leaving":
            symbol = "leave";
            break;
        case "elevator":
            symbol = "elevator";
            break;
        case "straight":
            symbol = "forward";
            break;
        case "left":
        case "sharp left":
            symbol = "left";
            break;
        case "slight left":
            symbol = "slight left";
            break;
        case "right":
        case "sharp right":
            symbol = "right";
            break;
        case "slight right":
            symbol = "slight right";
            break;
    }

    switch(symbol)
    {
        case "pin":
            return <Pin style={[styles.symbolImage, { maxHeight: "60%", height: "60%" }]}></Pin>;
        case "enter":
        case "leave":
        case "forward":
        case "elevator":
            return <Arrow style={[styles.symbolImage]}></Arrow>;
        case "left":
            return <Arrow style={[styles.symbolImage, { transform: [{ rotate: "-90deg" }] }]}></Arrow>;
        case "slight left":
            return <Arrow style={[styles.symbolImage, { transform: [{ rotate: "-35deg" }] }]}></Arrow>;
        case "right":
            return <Arrow style={[styles.symbolImage, { transform: [{ rotate: "90deg" }] }]}></Arrow>;
        case "slight right":
            return <Arrow style={[styles.symbolImage, { transform: [{ rotate: "35deg" }] }]}></Arrow>;
        default:
            return <Arrow style={[styles.symbolImage]}></Arrow>;
    }
}

const styles = StyleSheet.create({
    symbolImage: {
        opacity: 1,
        maxHeight: "80%",
        aspectRatio: "1/1",
        height: "80%"
    },
});