# fs

[![JSR](https://jsr.io/badges/@miyauci/fs)](https://jsr.io/@miyauci/fs)
[![codecov](https://codecov.io/gh/TomokiMiyauci/fs/graph/badge.svg?token=KJNNOLNBOD)](https://codecov.io/gh/TomokiMiyauci/fs)
[![GitHub](https://img.shields.io/github/license/TomokiMiyauci/fs)](https://github.com/TomokiMiyauci/fs/blob/main/LICENSE)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

[File System Standard](https://whatpr.org/fs/165.html), based on WHATWG spec
reference implementation.

## Table of Contents <!-- omit in toc -->

- [Install](#install)
- [Usage](#usage)
  - [FileSystemObserver](#filesystemobserver)
    - [With Deno File System](#with-deno-file-system)
- [API](#api)
- [Contributing](#contributing)
- [License](#license)

## Install

deno:

```bash
deno add @miyauci/fs@$VERSION
```

node:

```bash
npx jsr add @miyauci/fs@$VERSION
```

## Usage

`FileSystemHandle` can be referenced as
[OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
(Origin Private File System aka Bucket File System).

```ts
import { StorageManager } from "@miyauci/fs@$VERSION";
import { FileSystem } from "@miyauci/fs@$VERSION/deno";

const fileSystem = new FileSystem("path/to/dir"); // default is "."
const storage = new StorageManager(fileSystem);

const handle = await storage.getDirectory();
const fileHandle = await handle.getFileHandle("file.txt", { create: true });
const file = await fileHandle.getFile();
const contents = await file.text();
```

This allows operations to be performed on the File System using the File System
API.

### FileSystemObserver

[FileSystemObserver](https://whatpr.org/fs/165.html#api-filesystemobserver)
monitors changes to the `FileSystemHandle`.

```ts
import {
  type FileSystemHandle,
  FileSystemObserver,
  type FileSystemObserverCallback,
} from "@miyauci/fs@$VERSION";

declare const handle: FileSystemHandle;
declare const callback: FileSystemObserverCallback;
const observer = new FileSystemObserver(callback);

await observer.observe(handle);
```

#### With Deno File System

To use `FileSystemObserver` with `FileSystem`, you must call `FileSystem#watch`.

This will internally call `Deno.watchFs` to monitor the file system. It is a
deliberate decision not to do this automatically in the constructor.

```ts
import {
  FileSystemObserver,
  type FileSystemObserverCallback,
  StorageManager,
} from "@miyauci/fs@$VERSION";
import { FileSystem } from "@miyauci/fs@$VERSION/deno";

const fileSystem = new FileSystem();
const storage = new StorageManager(fileSystem);
const handle = await storage.getDirectory();
declare const callback: FileSystemObserverCallback;
const observer = new FileSystemObserver(callback);

fileSystem.watch();
await observer.observe(handle, { recursive: true });

await handle.getFileHandle("file.txt", { create: true });

fileSystem.unwatch();
```

Also, `FileSystem#unwatch` will stop the monitoring.

## API

See [jsr doc](https://jsr.io/@miyauci/fs) for all APIs.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[MIT](LICENSE) © 2024 Tomoki Miyauchi
