import rigs from "./setups.json" with { type: "json" };
import appleSpeed from "./apple_speed.json" with { type: "json" };
import gpuSpeed from "./gpu_speed.json" with { type: "json" };
import { buildModels } from "../_lib/models-merge.js";
import { buildSetups } from "../_lib/setups.js";

export default function () {
  return buildSetups(rigs, buildModels(), { appleSpeed, gpuSpeed });
}
