import { createFeature } from "../../utils/createFeature.js";
import { Timer } from "./Timer.js";

export const TimerFeature = createFeature({
    name: "Timer",
    register: container => {
        container.register(Timer);
    }
});
