// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from 'path';

export const EXTENSION_ID = 'clearml-session-manager';
export const SETTINGS_NAMESPACE = EXTENSION_ID;
export const EXTENSION_NAME = 'ClearML Session Manager';
const folderName = path.basename(__dirname);
export const EXTENSION_ROOT_DIR =
  folderName === 'common' ? path.dirname(path.dirname(__dirname)) : path.dirname(__dirname);
export const BUNDLED_PYTHON_SCRIPTS_DIR = path.join(EXTENSION_ROOT_DIR, 'bundled');
export const SERVER_SCRIPT_PATH = path.join(BUNDLED_PYTHON_SCRIPTS_DIR, 'tool', `lsp_server.py`);
export const DEBUG_SERVER_SCRIPT_PATH = path.join(BUNDLED_PYTHON_SCRIPTS_DIR, 'tool', `_debug_server.py`);
