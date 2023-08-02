import type { Config } from "jest";

const config: Config = {
  preset: "@ndxbn/preset-jest",

  collectCoverageFrom: ["src/**/*"],
  verbose: true,
};

export default config;
