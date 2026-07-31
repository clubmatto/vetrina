// NOTE: this file must keep `default` as its only export — Eleventy only
// elevates the default export to a data key when there are no named exports.
// Testable helpers live in ../_lib/models-merge.js.
import { buildModels } from "../_lib/models-merge.js";

export default buildModels;
