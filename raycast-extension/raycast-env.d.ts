/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API URL - Leo API endpoint */
  "apiUrl": string,
  /** Auth Token - Extension authentication token */
  "authToken": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `recall` command */
  export type Recall = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `recall` command */
  export type Recall = {}
}

