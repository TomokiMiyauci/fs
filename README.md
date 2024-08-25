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
  - [Supported Runtime](#supported-runtime)
  - [FileSystemObserver](#filesystemobserver)
    - [`FileSystemObserver` with `BucketFileSystem`](#filesystemobserver-with-bucketfilesystem)
- [Documents](#documents)
- [API](#api)
- [Contributing](#contributing)
- [License](#license)

## Install

deno:

```bash
deno add @miyauci/fs
```

node:

```bash
npx jsr add @miyauci/fs
```

## Usage

`FileSystemHandle` can be referenced as
[OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
(Origin Private File System aka Bucket File System).

```ts
import { StorageManager } from "@miyauci/fs";
import { BucketFileSystem } from "@miyauci/fs/$RUNTIME";

const fileSystem = new BucketFileSystem("path/to/dir"); // default is "."
const storage = new StorageManager(fileSystem);

const handle = await storage.getDirectory();
const fileHandle = await handle.getFileHandle("file.txt", { create: true });
const file = await fileHandle.getFile();
const contents = await file.text();
```

This allows operations to be performed on the local file system using the File
System API.

### Supported Runtime

The following run-times are supported:

| Runtime           | Import Specifier   |
| ----------------- | ------------------ |
| Deno              | `@miyauci/fs/deno` |
| Node.js, Deno[^1] | `@miyauci/fs/node` |

[^1]: Available on Deno Deploy. See
[To use on Deno Deploy](./docs/faq.md#to-use-on-deno-deploy)

Each endpoint is only guaranteed to run at the corresponding runtime.

### FileSystemObserver

[FileSystemObserver](https://whatpr.org/fs/165.html#api-filesystemobserver)
monitors changes to the `FileSystemHandle`.

```ts
import {
  type FileSystemHandle,
  FileSystemObserver,
  type FileSystemObserverCallback,
} from "@miyauci/fs";

declare const handle: FileSystemHandle;
declare const callback: FileSystemObserverCallback;
const observer = new FileSystemObserver(callback);

await observer.observe(handle);
```

#### `FileSystemObserver` with `BucketFileSystem`

To use `FileSystemObserver` with `BucketFileSystem`, you must call
`BucketFileSystem#watch`.

```ts
import {
  FileSystemObserver,
  type FileSystemObserverCallback,
  StorageManager,
} from "@miyauci/fs";
import { BucketFileSystem } from "@miyauci/fs/$RUNTIME";

const fileSystem = new BucketFileSystem();
const storage = new StorageManager(fileSystem);
const handle = await storage.getDirectory();
declare const callback: FileSystemObserverCallback;
const observer = new FileSystemObserver(callback);

fileSystem.watch();
await observer.observe(handle, { recursive: true });

await handle.getFileHandle("file.txt", { create: true });
```

`BucketFileSystem#unwatch` will stop the monitoring.

## Documents

- [FAQ](./docs/faq.md)

## API

The API is published according to the following criteria:

- WebIDL
- Defined as an algorithm in the specification

See [jsr doc](https://jsr.io/@miyauci/fs) for all APIs.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[MIT](LICENSE) © 2024 Tomoki Miyauchi
